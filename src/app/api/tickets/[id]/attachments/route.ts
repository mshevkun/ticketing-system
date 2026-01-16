import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

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

    // Fetch ticket to get attachments
    const { data: ticket, error: ticketError } = await supabaseServer
      .from("tickets")
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
      return NextResponse.json({ urls: [] });
    }

    // Generate signed URLs for all attachments
    const signedUrls: Record<string, string> = {};

    for (const filePath of ticket.attachments) {
      const { data, error } = await supabaseServer.storage
        .from(BUCKET)
        .createSignedUrl(filePath, URL_EXPIRY);

      if (error) {
        console.error(`Error generating signed URL for ${filePath}:`, error);
        continue;
      }

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
