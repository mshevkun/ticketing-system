import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const IT_EMAILS = ["cmansilla@people-usa.org", "mshevkun@people-usa.org"];

// DELETE /api/tickets/[id]
// Delete a ticket (only creator or IT staff can delete)
export async function DELETE(
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

    // Get user email from Authorization header or request body
    const body = await req.json().catch(() => ({}));
    const userEmail = (body.userEmail as string) || null;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email is required" },
        { status: 401 }
      );
    }

    // Fetch ticket to check ownership
    const { data: ticket, error: ticketError } = await supabaseServer
      .from("tickets")
      .select("requester_email")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Check authorization: IT staff OR ticket creator
    const isITStaff = IT_EMAILS.includes(userEmail);
    const isCreator = ticket.requester_email === userEmail;

    if (!isITStaff && !isCreator) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own tickets or must be IT staff" },
        { status: 403 }
      );
    }

    // Delete the ticket
    const { error: deleteError } = await supabaseServer
      .from("tickets")
      .delete()
      .eq("id", ticketId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete ticket", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      ok: true, 
      message: "Ticket deleted successfully" 
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to delete ticket", details: msg },
      { status: 500 }
    );
  }
}
