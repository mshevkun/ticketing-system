import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

// GET /api/tickets/[id]/comments
// Comments for one ticket. Used when the viewer has no Supabase session.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;
    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("comments")
      .select("id, author_email, content, created_at, attachments")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load comments", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ comments: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to load comments", details: msg },
      { status: 500 }
    );
  }
}
