import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { MAINTENANCE_EMAILS } from "@/lib/constants";

export const runtime = "nodejs";

// POST /api/tickets/[id]/read
// Mark ticket as read for the current user (updates last_read_at)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;
    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const userEmail = (body.userEmail as string)?.trim();
    if (!userEmail) {
      return NextResponse.json({ error: "userEmail required" }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await supabaseServer
      .from("maintenance_tickets")
      .select("requester_email")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const isMaintenance = MAINTENANCE_EMAILS.includes(userEmail);
    const isRequester = ticket.requester_email === userEmail;
    if (!isMaintenance && !isRequester) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await supabaseServer
      .from("maintenance_ticket_reads")
      .upsert(
        {
          user_email: userEmail,
          ticket_id: ticketId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "user_email,ticket_id" }
      );

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to mark as read", details: msg },
      { status: 500 }
    );
  }
}
