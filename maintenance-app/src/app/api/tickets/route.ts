// app/api/tickets/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendEmailsWithRateLimit } from "@/lib/email";
import { MAINTENANCE_EMAILS, getMaintenanceTicketViewUrl } from "@/lib/constants";
import type { PostgrestError } from "@supabase/supabase-js";

export const runtime = "nodejs";

// ---------- Config ----------
const BUCKET = "attachments";
const DEBUG = process.env.NODE_ENV !== "production";
const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

// ---------- Utils ----------
function jsonError(
  message: string,
  status = 500,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error: { message, ...extra } }, { status });
}
function log(...args: unknown[]) {
  console.log("[tickets.api]", ...args);
}
function logError(...args: unknown[]) {
  console.error("[tickets.api][ERROR]", ...args);
}
function sbErrInfo(err: PostgrestError | null | undefined) {
  return err
    ? {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
      }
    : undefined;
}

type NormalizedStorageErr = {
  message: string;
  name?: string;
  statusCode?: number;
  status?: number;
};

function stErrInfo(err: unknown): NormalizedStorageErr | undefined {
  if (!err || typeof err !== "object") return undefined;

  const maybeMsg = (err as { message?: unknown }).message;
  const maybeName = (err as { name?: unknown }).name;
  const maybeStatusCode = (err as { statusCode?: unknown }).statusCode;
  const maybeStatus = (err as { status?: unknown }).status;

  const info: NormalizedStorageErr = {
    message: typeof maybeMsg === "string" ? maybeMsg : "Unknown storage error",
  };

  if (typeof maybeName === "string") info.name = maybeName;
  if (typeof maybeStatusCode === "number") info.statusCode = maybeStatusCode;
  if (typeof maybeStatus === "number") info.status = maybeStatus;

  return info;
}

// Category options (must match form dropdown)
const CATEGORY_OPTIONS = [
  "Building",
  "Vehicle",
  "Electrical",
  "Plumbing",
  "Grounds",
  "Other",
] as const;

// ---------- Validation ----------
const TicketSchema = z.object({
  title: z.string().min(3, "Title is required (min 3)"),
  description: z.string().min(5, "Description is required (min 5)"),
  category: z.enum(CATEGORY_OPTIONS),
  department_program: z.string().min(1, "Department/Program is required"),
  supervisor: z.string().min(1, "Supervisor is required"),
  requester_email: z.string().email("Valid email is required"),
});
type TicketInput = z.infer<typeof TicketSchema>;

// ---------- Handler ----------
export async function POST(req: Request) {
  try {
    // 0) ENV sanity
    const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      logError("Missing env vars:", missing);
      return jsonError("Server misconfigured: missing env vars", 500, {
        missingEnv: missing,
      });
    }

    const contentType = req.headers.get("content-type") ?? "";

    // --------- A) multipart/form-data (with files)
    if (contentType.includes("multipart/form-data")) {
      let form: FormData;
      try {
        form = await req.formData();
      } catch (e) {
        logError("formData() parse failed", e);
        return jsonError("Failed to parse form-data", 400);
      }

      const values: TicketInput = {
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        category: String(form.get("category") ?? "") as TicketInput["category"],
        department_program: String(form.get("department_program") ?? ""),
        supervisor: String(form.get("supervisor") ?? ""),
        requester_email: String(form.get("requester_email") ?? ""),
      };
      const files = form.getAll("attachments") as File[];

      const parsed = TicketSchema.safeParse(values);
      if (!parsed.success) {
        const issues = parsed.error.flatten();
        if (DEBUG) log("Validation error:", issues);
        return jsonError("Validation failed", 400, { issues });
      }

      // 1) Create ticket
      const ins = await supabaseServer
        .from("maintenance_tickets")
        .insert({ ...values, status: "new" })
        .select("*")
        .single();

      if (ins.error || !ins.data) {
        const info = sbErrInfo(ins.error);
        logError("Insert failed:", info);
        return jsonError("Insert failed", 500, { supabase: info });
      }

      const ticket = ins.data;
      const uploadedPaths: string[] = [];
      const uploadErrors: Array<{
        file: string;
        error: ReturnType<typeof stErrInfo> | { message: string };
      }> = [];

      // 2) Upload files
      for (const file of files) {
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const ext = (file.name.split(".").pop() || "bin").toLowerCase();
          const key = `tickets/${
            ticket.id
          }/${Date.now()}_${randomUUID()}.${ext}`;

          const up = await supabaseServer.storage
            .from(BUCKET)
            .upload(key, buffer, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });

          if (up.error) {
            const info = stErrInfo(up.error);
            uploadErrors.push({
              file: file.name,
              error: info ?? { message: "Unknown storage error" },
            });
            logError("Upload error:", { file: file.name, error: info });
            continue;
          }
          uploadedPaths.push(up.data.path);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          uploadErrors.push({ file: file.name, error: { message: msg } });
          logError("Upload exception:", { file: file.name, message: msg });
        }
      }

      // 3) Save paths on ticket
      if (uploadedPaths.length > 0) {
        const upd = await supabaseServer
          .from("maintenance_tickets")
          .update({ attachments: uploadedPaths })
          .eq("id", ticket.id);
        if (upd.error)
          logError("Attachment update error:", sbErrInfo(upd.error));
      }

      // 4) Notifications: requester (confirmation) + maintenance staff (new request)
      const ticketUrl = getMaintenanceTicketViewUrl(ticket.id);
      const requesterConfirmHtml = `
        <p>Hello,</p>
        <p>Your maintenance request <strong>${ticket.title}</strong> has been submitted successfully.</p>
        <p>Our team will review it and get back to you.</p>
        <p><a href="${ticketUrl}">View your ticket</a></p>
        <p>— Maintenance Team</p>
      `;
      const maintenanceAlertHtml = `
        <p>A new maintenance request has been submitted.</p>
        <p><strong>Title:</strong> ${ticket.title}</p>
        <p><strong>From:</strong> ${ticket.requester_email}</p>
        <p><a href="${ticketUrl}">View and respond to this request</a></p>
        <p>— Maintenance Ticketing System</p>
      `;
      const ticketEmails = [
        {
          to: ticket.requester_email,
          subject: `Ticket submitted: ${ticket.title}`,
          html: requesterConfirmHtml,
        },
        ...MAINTENANCE_EMAILS.map((maintenanceEmail) => ({
          to: maintenanceEmail,
          subject: `New maintenance request: ${ticket.title}`,
          html: maintenanceAlertHtml,
        })),
      ];
      await sendEmailsWithRateLimit(ticketEmails);

      return NextResponse.json(
        {
          ticket_id: ticket.id,
          uploaded: uploadedPaths.length,
          uploadErrors: uploadErrors.length ? uploadErrors : undefined,
        },
        { status: 201 },
      );
    }

    // --------- B) JSON (no files)
    let body: unknown;
    try {
      body = await req.json();
    } catch (e) {
      logError("JSON parse failed", e);
      return jsonError("Invalid JSON body", 400);
    }

    const parsed = TicketSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.flatten();
      if (DEBUG) log("Validation error:", issues);
      return jsonError("Validation failed", 400, { issues });
    }

    const ins = await supabaseServer
      .from("maintenance_tickets")
      .insert(parsed.data)
      .select("id")
      .single();
    if (ins.error || !ins.data) {
      const info = sbErrInfo(ins.error);
      logError("Insert failed (JSON):", info);
      return jsonError("Insert failed", 500, { supabase: info });
    }

    const ticket = { id: ins.data.id, ...parsed.data };
    const ticketUrl = getMaintenanceTicketViewUrl(ticket.id);
    const requesterConfirmHtml = `
      <p>Hello,</p>
      <p>Your maintenance request <strong>${ticket.title}</strong> has been submitted successfully.</p>
      <p>Our team will review it and get back to you.</p>
      <p><a href="${ticketUrl}">View your ticket</a></p>
      <p>— Maintenance Team</p>
    `;
    const maintenanceAlertHtml = `
      <p>A new maintenance request has been submitted.</p>
      <p><strong>Title:</strong> ${ticket.title}</p>
      <p><strong>From:</strong> ${ticket.requester_email}</p>
      <p><a href="${ticketUrl}">View and respond to this request</a></p>
      <p>— Maintenance Ticketing System</p>
    `;
    const jsonEmails = [
      {
        to: ticket.requester_email,
        subject: `Ticket submitted: ${ticket.title}`,
        html: requesterConfirmHtml,
      },
      ...MAINTENANCE_EMAILS.map((maintenanceEmail) => ({
        to: maintenanceEmail,
        subject: `New maintenance request: ${ticket.title}`,
        html: maintenanceAlertHtml,
      })),
    ];
    await sendEmailsWithRateLimit(jsonEmails);

    return NextResponse.json({ ticket_id: ins.data.id }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logError("Unhandled exception:", msg);
    return jsonError(
      "Unexpected error",
      500,
      DEBUG ? { message: msg } : undefined,
    );
  }
}
