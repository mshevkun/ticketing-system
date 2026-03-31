import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { MAINTENANCE_EMAILS } from "@/lib/constants";

export const runtime = "nodejs";

const BUCKET = "attachments";
const URL_EXPIRY = 3600;

// GET /api/comments/[id]/attachments
// Returns signed URLs for a comment's attachments
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID is required" },
        { status: 400 }
      );
    }

    const { data: comment, error } = await supabaseServer
      .from("maintenance_comments")
      .select("attachments")
      .eq("id", commentId)
      .single();

    if (error || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const attachments = Array.isArray(comment.attachments)
      ? comment.attachments
      : [];
    if (attachments.length === 0) {
      return NextResponse.json({ urls: {} });
    }

    const urls: Record<string, string> = {};
    for (const filePath of attachments) {
      const { data, error: urlError } = await supabaseServer.storage
        .from(BUCKET)
        .createSignedUrl(filePath, URL_EXPIRY);
      if (urlError) continue;
      urls[filePath] = data.signedUrl;
    }

    return NextResponse.json({ urls });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to get attachment URLs", details: msg },
      { status: 500 }
    );
  }
}

// DELETE /api/comments/[id]/attachments
// Remove one attachment from a comment (author or maintenance staff)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID is required" },
        { status: 400 }
      );
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

    const { data: comment, error: commentError } = await supabaseServer
      .from("maintenance_comments")
      .select("attachments, author_email")
      .eq("id", commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const isMaintenance = MAINTENANCE_EMAILS.includes(userEmail);
    const isAuthor = comment.author_email === userEmail;
    if (!isMaintenance && !isAuthor) {
      return NextResponse.json(
        { error: "Only the message author or maintenance staff can remove attachments" },
        { status: 403 }
      );
    }

    const attachments: string[] = Array.isArray(comment.attachments)
      ? comment.attachments
      : [];
    if (!attachments.includes(filePath)) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const newAttachments = attachments.filter((p) => p !== filePath);
    await supabaseServer.storage.from(BUCKET).remove([filePath]);

    const { error: updateError } = await supabaseServer
      .from("maintenance_comments")
      .update({ attachments: newAttachments })
      .eq("id", commentId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update comment", details: updateError.message },
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
