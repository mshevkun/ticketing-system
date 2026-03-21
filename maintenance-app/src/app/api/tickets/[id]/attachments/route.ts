import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabaseServer";
import { MAINTENANCE_EMAILS } from "@/lib/constants";

export const runtime = "nodejs";

const BUCKET = "attachments";
const URL_EXPIRY = 3600; // 1 hour in seconds

// GET /api/tickets/[id]/attachments
// Returns signed URLs for all attachments in a ticket
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;

    if (!ticketId) {
      return NextResponse.json(
        { error: "Ticket ID is required" },
        { status: 400 }
      );
    }

    const { data: ticket, error: ticketError } = await supabaseServer
      .from("maintenance_tickets")
      .select("attachments")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    if (!ticket.attachments || ticket.attachments.length === 0) {
      return NextResponse.json({ urls: {} });
    }

    const signedUrls: Record<string, string> = {};
    for (const filePath of ticket.attachments) {
      const { data, error } = await supabaseServer.storage
        .from(BUCKET)
        .createSignedUrl(filePath, URL_EXPIRY);
      if (error) continue;
      signedUrls[filePath] = data.signedUrl;
    }

    return NextResponse.json({ urls: signedUrls });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to generate attachment URLs", details: msg },
      { status: 500 }
    );
  }
}

// POST /api/tickets/[id]/attachments
// Add attachments to an existing ticket (requester or maintenance staff)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;
    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const userEmail = String(form.get("userEmail") ?? "").trim();
    if (!userEmail) {
      return NextResponse.json({ error: "userEmail is required" }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await supabaseServer
      .from("maintenance_tickets")
      .select("attachments, requester_email")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const isMaintenance = MAINTENANCE_EMAILS.includes(userEmail);
    const isCreator = ticket.requester_email === userEmail;
    if (!isMaintenance && !isCreator) {
      return NextResponse.json(
        { error: "Only the ticket creator or maintenance staff can add attachments" },
        { status: 403 }
      );
    }

    const files = form.getAll("attachments") as File[];
    const validFiles = files.filter((f) => f && f instanceof File && f.size > 0);
    if (validFiles.length === 0) {
      return NextResponse.json(
        { error: "At least one file is required" },
        { status: 400 }
      );
    }

    const currentPaths: string[] = Array.isArray(ticket.attachments)
      ? [...ticket.attachments]
      : [];
    const uploadedPaths: string[] = [];

    for (const file of validFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const key = `maintenance_tickets/${ticketId}/${Date.now()}_${randomUUID()}.${ext}`;
      const { data: up, error } = await supabaseServer.storage
        .from(BUCKET)
        .upload(key, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (error) continue;
      uploadedPaths.push(up.path);
    }

    if (uploadedPaths.length === 0) {
      return NextResponse.json(
        { error: "Failed to upload any file" },
        { status: 500 }
      );
    }

    const newAttachments = [...currentPaths, ...uploadedPaths];
    const { error: updateError } = await supabaseServer
      .from("maintenance_tickets")
      .update({ attachments: newAttachments })
      .eq("id", ticketId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save attachments", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      added: uploadedPaths.length,
      attachments: newAttachments,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to add attachments", details: msg },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id]/attachments
// Remove one attachment from a ticket (requester or maintenance staff)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;
    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const userEmail = (body.userEmail as string)?.trim();
    const filePath = body.filePath as string;
    if (!userEmail || !filePath) {
      return NextResponse.json(
        { error: "userEmail and filePath are required" },
        { status: 400 }
      );
    }

    const { data: ticket, error: ticketError } = await supabaseServer
      .from("maintenance_tickets")
      .select("attachments, requester_email")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const isMaintenance = MAINTENANCE_EMAILS.includes(userEmail);
    const isCreator = ticket.requester_email === userEmail;
    if (!isMaintenance && !isCreator) {
      return NextResponse.json(
        { error: "Only the ticket creator or maintenance staff can remove attachments" },
        { status: 403 }
      );
    }

    const attachments: string[] = Array.isArray(ticket.attachments)
      ? ticket.attachments
      : [];
    if (!attachments.includes(filePath)) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const newAttachments = attachments.filter((p) => p !== filePath);
    await supabaseServer.storage.from(BUCKET).remove([filePath]);

    const { error: updateError } = await supabaseServer
      .from("maintenance_tickets")
      .update({ attachments: newAttachments })
      .eq("id", ticketId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update ticket", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, attachments: newAttachments });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to remove attachment", details: msg },
      { status: 500 }
    );
  }
}
