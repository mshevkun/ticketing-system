import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendEmail } from "@/lib/email";
import { IT_EMAILS } from "@/lib/constants";

export const runtime = "nodejs";

const BUCKET = "attachments";

// POST /api/comments
// Create a comment (message) with optional file attachments
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const ticketId = String(form.get("ticket_id") ?? "").trim();
    const authorEmail = String(form.get("author_email") ?? "").trim();
    const content = String(form.get("content") ?? "").trim();

    if (!ticketId || !authorEmail || !content) {
      return NextResponse.json(
        { error: "ticket_id, author_email, and content are required" },
        { status: 400 }
      );
    }

    // Verify ticket exists and get requester/title for notifications
    const { data: ticket, error: ticketError } = await supabaseServer
      .from("tickets")
      .select("id, requester_email, title")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Insert comment with empty attachments first
    const { data: comment, error: insertError } = await supabaseServer
      .from("comments")
      .insert({
        ticket_id: ticketId,
        author_email: authorEmail,
        content,
        attachments: [],
      })
      .select("id")
      .single();

    if (insertError || !comment) {
      return NextResponse.json(
        { error: "Failed to create comment", details: insertError?.message },
        { status: 500 }
      );
    }

    const files = form.getAll("attachments") as File[];
    const validFiles = files.filter((f) => f && f instanceof File && f.size > 0);
    const uploadedPaths: string[] = [];

    for (const file of validFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const key = `comments/${comment.id}/${Date.now()}_${randomUUID()}.${ext}`;
      const { data: up, error } = await supabaseServer.storage
        .from(BUCKET)
        .upload(key, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (error) continue;
      uploadedPaths.push(up.path);
    }

    if (uploadedPaths.length > 0) {
      await supabaseServer
        .from("comments")
        .update({ attachments: uploadedPaths })
        .eq("id", comment.id);
    }

    // Notifications: IT replied → email requester; requester/other replied → email all IT
    const isIT = IT_EMAILS.includes(authorEmail);
    const contentPreview =
      content.length > 200 ? content.slice(0, 200) + "…" : content;

    if (isIT) {
      const html = `
        <p>Hello,</p>
        <p>IT Support has replied to your ticket <strong>${ticket.title}</strong>.</p>
        <p><strong>Message:</strong></p>
        <p>${contentPreview.replace(/\n/g, "<br>")}</p>
        <p>View the full conversation in the People USA IT Ticketing System.</p>
        <p>— IT Ticketing System</p>
      `;
      sendEmail({
        to: ticket.requester_email,
        subject: `New reply on your ticket: ${ticket.title}`,
        html,
      }).catch((e) => console.error("[comments.api] Email to requester:", e));
    } else {
      const html = `
        <p>A new message was added to ticket <strong>${ticket.title}</strong>.</p>
        <p><strong>From:</strong> ${authorEmail}</p>
        <p><strong>Message:</strong></p>
        <p>${contentPreview.replace(/\n/g, "<br>")}</p>
        <p>View and respond in the People USA IT Ticketing System.</p>
        <p>— IT Ticketing System</p>
      `;
      for (const itEmail of IT_EMAILS) {
        sendEmail({
          to: itEmail,
          subject: `New message on ticket: ${ticket.title}`,
          html,
        }).catch((e) => console.error("[comments.api] Email to IT:", e));
      }
    }

    return NextResponse.json(
      { ok: true, comment_id: comment.id, attachments: uploadedPaths.length },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to create comment", details: msg },
      { status: 500 }
    );
  }
}
