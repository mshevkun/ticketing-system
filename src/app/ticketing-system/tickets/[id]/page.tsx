"use client";

import { useEffect, useState } from "react";
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
  const fetchTicket = async () => {
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
  };

  useEffect(() => {
    if (id) fetchTicket();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (!ticket) return <p>Ticket not found.</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{ticket.title}</h1>
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
              const { error } = await supabase
                .from("tickets")
                .update({ status: newStatus })
                .eq("id", ticket.id);

              if (!error) {
                setTicket((prev) => prev && { ...prev, status: newStatus });
              } else {
                alert("Failed to update status: " + error.message);
              }
            }}
          >
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
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
      <Comments ticketId={ticket.id} />

      {/* Form to add a new comment */}
      <CommentForm ticketId={ticket.id} /> {/* ← added */}
    </div>
  );
}
