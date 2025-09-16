"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Comments from "@/components/Comments";
import CommentForm from "@/components/CommentForm"; // ← added import

// Type for ticket record
type Ticket = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  requester_email: string;
  attachments: string[] | null;
};

export default function TicketPage() {
  const params = useParams();
  const id = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Hard-coded list of IT emails for MVP
  const IT_EMAILS = ["cmansilla@people-usa.org", "mshevkun@people-usa.org"];

  // Fetch current user email
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    };
    getUser();
  }, []);

  // Load ticket details from Supabase
  const fetchTicket = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching ticket:", error.message);
      setTicket(null);
    } else {
      setTicket(data);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) fetchTicket();
  }, [id, fetchTicket]);

  if (loading) return <p>Loading...</p>;
  if (!ticket) return <p>Ticket not found.</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">{ticket.title}</h1>
      <div className="text-sm text-gray-600 mb-3">
        {ticket.created_at ? (
          <span className="mr-3">
            Created: {new Date(ticket.created_at).toLocaleString()}
          </span>
        ) : null}
        {ticket.updated_at ? (
          <span>Updated: {new Date(ticket.updated_at).toLocaleString()}</span>
        ) : null}
      </div>
      <p className="mb-2">{ticket.description}</p>
      {/* Show dropdown for IT users, plain text for others */}
      {IT_EMAILS.includes(userEmail || "") ? (
        <div className="mb-4">
          <label className="block text-sm mb-1">Status</label>
          <select
            className="border rounded px-3 py-2"
            value={ticket.status}
            onChange={async (e) => {
              const newStatus = e.target.value;
              try {
                const res = await fetch("/api/tickets/status", {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    ticketId: ticket.id,
                    status: newStatus,
                    operator: userEmail,
                  }),
                });

                if (!res.ok) {
                  const body = await res.json().catch(() => ({}));
                  throw new Error(body?.error || "Failed to update status");
                }

                setTicket((prev) => prev && { ...prev, status: newStatus });
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                alert("Failed to update status: " + msg);
              }
            }}
          >
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      ) : (
        <p className="text-sm text-gray-600 mb-4">
          Category: {ticket.category} · Status: {ticket.status}
        </p>
      )}
      <p className="text-sm text-gray-500 mb-4">
        Created by: {ticket.requester_email}
      </p>
      {/* Attachments */}
      {ticket.attachments && ticket.attachments.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold mb-2">Attachments:</h2>
          <ul className="list-disc list-inside space-y-1">
            {ticket.attachments.map((file, idx) => (
              <li key={idx}>
                <a
                  href={`https://hdrvrkzmbnrisxgtmhem.supabase.co/storage/v1/object/public/attachments/${file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {file.split("/").pop()}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Comments section */}
      <Comments ticketId={ticket.id} requesterEmail={ticket.requester_email} />
      {/* Form to add a new comment */}
      <CommentForm ticketId={ticket.id} /> {/* ← added */}
    </div>
  );
}
