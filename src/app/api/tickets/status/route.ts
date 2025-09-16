import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const IT_EMAILS = ["cmansilla@people-usa.org", "mshevkun@people-usa.org"];

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

    const upd = await supabaseServer
      .from("tickets")
      .update({ status })
      .eq("id", ticketId);

    if (upd.error) {
      return NextResponse.json({ error: upd.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
