import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { MAINTENANCE_EMAILS } from "@/lib/constants";

export const runtime = "nodejs";

// GET /api/tickets/unread?userEmail=...
// Returns ticket IDs that have unread replies for the user
export async function GET(req: NextRequest) {
  try {
    const userEmail = req.nextUrl.searchParams.get("userEmail")?.trim();
    if (!userEmail) {
      return NextResponse.json(
        { error: "userEmail query param required" },
        { status: 400 }
      );
    }

    const isMaintenance = MAINTENANCE_EMAILS.includes(userEmail);

    // Get tickets the user can see
    let ticketsQuery = supabaseServer
      .from("maintenance_tickets")
      .select("id, requester_email");

    if (!isMaintenance) {
      ticketsQuery = ticketsQuery.eq("requester_email", userEmail);
    }

    const { data: tickets, error: ticketsError } = await ticketsQuery;

    if (ticketsError || !tickets) {
      return NextResponse.json(
        { error: "Failed to fetch tickets", details: ticketsError?.message },
        { status: 500 }
      );
    }

    if (tickets.length === 0) {
      return NextResponse.json({ unreadIds: [] });
    }

    const ticketIds = tickets.map((t) => t.id);

    // Get latest comment per ticket
    const { data: comments, error: commentsError } = await supabaseServer
      .from("maintenance_comments")
      .select("ticket_id, created_at, author_email")
      .in("ticket_id", ticketIds);

    if (commentsError) {
      return NextResponse.json(
        { error: "Failed to fetch comments", details: commentsError?.message },
        { status: 500 }
      );
    }

    const latestCommentByTicket: Record<
      string,
      { created_at: string; author_email: string }
    > = {};
    for (const c of comments || []) {
      const existing = latestCommentByTicket[c.ticket_id];
      if (
        !existing ||
        (c.created_at && c.created_at > existing.created_at)
      ) {
        latestCommentByTicket[c.ticket_id] = {
          created_at: c.created_at,
          author_email: c.author_email ?? "",
        };
      }
    }

    // Get last_read_at for user
    const { data: reads } = await supabaseServer
      .from("maintenance_ticket_reads")
      .select("ticket_id, last_read_at")
      .eq("user_email", userEmail)
      .in("ticket_id", ticketIds);

    const lastReadByTicket: Record<string, string> = {};
    for (const r of reads || []) {
      lastReadByTicket[r.ticket_id] = r.last_read_at;
    }

    const unreadIds: string[] = [];
    for (const ticketId of ticketIds) {
      const latest = latestCommentByTicket[ticketId];
      if (!latest) {
        // No comments yet — new ticket. Show red dot for maintenance staff until they view it
        if (isMaintenance) {
          const lastRead = lastReadByTicket[ticketId];
          if (!lastRead) {
            unreadIds.push(ticketId);
          }
        }
        continue;
      }
      if (latest.author_email === userEmail) continue;

      const lastRead = lastReadByTicket[ticketId];
      if (!lastRead || latest.created_at > lastRead) {
        unreadIds.push(ticketId);
      }
    }

    return NextResponse.json({ unreadIds });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to get unread tickets", details: msg },
      { status: 500 }
    );
  }
}
