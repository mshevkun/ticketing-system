"use client";

import TicketList from "@/components/TicketList";

export default function TicketsPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">All Tickets</h1>
      <TicketList />
    </main>
  );
}
