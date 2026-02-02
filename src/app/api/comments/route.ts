import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabaseServer";

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

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await supabaseServer
      .from("tickets")
      .select("id")
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
