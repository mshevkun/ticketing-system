"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Ticket = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  requester_email: string;
  attachments: string[] | null;
};

export default function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const IT_EMAILS = [
    "cmansilla@people-usa.org",
    "mshevkun@people-usa.org",
  ];

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    };
    getUser();
  }, []);

  const fetchTickets = async () => {
    if (!userEmail) return;

    setLoading(true);

    let query = supabase.from("tickets").select("*").order("title", {
      ascending: true,
    });

    if (!IT_EMAILS.includes(userEmail)) {
      query = query.eq("requester_email", userEmail);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching tickets:", error.message);
      setTickets([]);
    } else {
      setTickets(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (userEmail) fetchTickets();
  }, [userEmail]);

  useEffect(() => {
    const handler = () => fetchTickets();
    window.addEventListener("ticket:created", handler);
    return () => window.removeEventListener("ticket:created", handler);
  }, [userEmail]);

  if (loading) return <p>Loading tickets...</p>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-xl font-semibold mb-4">My Tickets</h2>
      {tickets.length === 0 ? (
        <p>No tickets found.</p>
      ) : (
        <ul className="space-y-3">
          {tickets.map((t) => (
            <li
              key={t.id}
              className="border rounded p-3 hover:bg-gray-50 transition"
            >
              <a
                href={`/ticketing-system/${t.id}`}
                className="block text-blue-600 hover:underline"
              >
                {t.title}
              </a>
              <p className="text-sm text-gray-700">{t.description}</p>
              <p className="text-xs text-gray-500">
                {t.category} · {t.status} · {t.requester_email}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
