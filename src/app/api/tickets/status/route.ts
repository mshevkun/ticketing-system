import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendEmailsWithRateLimit } from "@/lib/email";
import { IT_EMAILS } from "@/lib/constants";

export const runtime = "nodejs";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { ticketId, status, operator } = body as {
      ticketId?: string;
      status?: string;
      operator?: string | null;
    };

    if (!ticketId || !status) {
      return NextResponse.json(
        { error: "ticketId and status required" },
        { status: 400 }
      );
    }

    if (!operator || !IT_EMAILS.includes(operator)) {
      return NextResponse.json(
        { error: "Forbidden: only IT staff can update status" },
        { status: 403 }
      );
    }

    // Fetch ticket before update (for email notification)
    const { data: ticket, error: fetchError } = await supabaseServer
      .from("tickets")
      .select("requester_email, title, status")
      .eq("id", ticketId)
      .single();

    if (fetchError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const upd = await supabaseServer
      .from("tickets")
      .update({ status })
      .eq("id", ticketId);

    if (upd.error) {
      return NextResponse.json({ error: upd.error.message }, { status: 500 });
    }

    // Notify requester + all IT staff (rate-limited to respect Resend 2 req/sec)
    const statusLabel = STATUS_LABELS[status] || status;
    const subject = `Ticket status updated: ${ticket.title}`;

    const requesterHtml = `
      <p>Hello,</p>
      <p>Your IT ticket <strong>${ticket.title}</strong> has been updated.</p>
      <p><strong>New status:</strong> ${statusLabel}</p>
      <p>You can view the ticket in the People USA IT Ticketing System.</p>
      <p>— IT Support</p>
    `;

    const itHtml = `
      <p>A ticket status was updated.</p>
      <p><strong>Ticket:</strong> ${ticket.title}</p>
      <p><strong>New status:</strong> ${statusLabel}</p>
      <p><strong>Updated by:</strong> ${operator}</p>
      <p>View the ticket in the People USA IT Ticketing System.</p>
      <p>— IT Ticketing System</p>
    `;

    const emails: Array<{ to: string; subject: string; html: string }> = [
      { to: ticket.requester_email, subject, html: requesterHtml },
    ];
    for (const itEmail of IT_EMAILS) {
      if (itEmail === operator) continue; // don't email who made the change
      emails.push({ to: itEmail, subject, html: itHtml });
    }
    await sendEmailsWithRateLimit(emails);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
