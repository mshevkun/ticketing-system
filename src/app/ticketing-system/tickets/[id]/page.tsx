"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Comments from "@/components/Comments";
import CommentForm from "@/components/CommentForm";
import StatusBadge from "@/components/StatusBadge";

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
  const router = useRouter();
  const id = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);

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

      // Fetch signed URLs for attachments if they exist
      if (data.attachments && data.attachments.length > 0) {
        try {
          const res = await fetch(`/api/tickets/${id}/attachments`);
          if (res.ok) {
            const { urls } = await res.json();
            setSignedUrls(urls || {});
          }
        } catch (err) {
          console.error("Error fetching signed URLs:", err);
        }
      }
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) fetchTicket();
  }, [id, fetchTicket]);

  // Delete ticket handler
  const handleDelete = async () => {
    if (!ticket || !userEmail) return;

    // Check if user has permission
    const isITStaff = IT_EMAILS.includes(userEmail);
    const isCreator = ticket.requester_email === userEmail;

    if (!isITStaff && !isCreator) {
      alert("You don't have permission to delete this ticket.");
      return;
    }

    // Confirm deletion
    const confirmMessage = isITStaff
      ? `Are you sure you want to delete this ticket "${ticket.title}"? This action cannot be undone.`
      : `Are you sure you want to delete your ticket "${ticket.title}"? This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userEmail }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete ticket");
      }

      // Redirect to ticket list after successful deletion
      router.push("/ticketing-system");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Error deleting ticket: " + msg);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
          <div className="text-4xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ticket not found
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            The ticket you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <button
            onClick={() => router.push("/ticketing-system")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            ← Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/ticketing-system")}
        className="mb-4 sm:mb-6 text-xs sm:text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors cursor-pointer"
      >
        <span>←</span> Back to Tickets
      </button>

      {/* Ticket Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3 sm:gap-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 break-words">
              📋 {ticket.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                #{ticket.id.slice(0, 8)}
              </span>
              {ticket.created_at && (
                <span className="flex items-center gap-1">
                  <span>📅</span>{" "}
                  <span className="whitespace-nowrap">
                    Created: {formatDate(ticket.created_at)}
                  </span>
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <StatusBadge status={ticket.status} size="md" />
            {/* Delete button - visible to creator or IT staff */}
            {(IT_EMAILS.includes(userEmail || "") ||
              ticket.requester_email === userEmail) && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-red-600 bg-white border border-red-300 rounded-full hover:bg-red-50 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-sm hover:shadow whitespace-nowrap"
                title={
                  IT_EMAILS.includes(userEmail || "")
                    ? "Delete this ticket (IT staff)"
                    : "Delete your ticket"
                }
              >
                {deleting ? (
                  <span className="flex items-center gap-1.5">
                    <span className="animate-spin text-xs">⏳</span>
                    <span>Deleting...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span>Delete ticket</span>
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
            Description
          </h3>
          <p className="text-sm sm:text-base text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
            {ticket.description}
          </p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              Category
            </p>
            <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
              🏷️ {ticket.category}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              Status
            </p>
            <div className="flex items-center gap-1">
              {IT_EMAILS.includes(userEmail || "") ? (
                <select
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
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
                        throw new Error(
                          body?.error || "Failed to update status"
                        );
                      }

                      setTicket(
                        (prev) => prev && { ...prev, status: newStatus }
                      );
                    } catch (err) {
                      const msg =
                        err instanceof Error ? err.message : String(err);
                      alert("Failed to update status: " + msg);
                    }
                  }}
                >
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              ) : (
                <StatusBadge status={ticket.status} size="sm" />
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              Created By
            </p>
            <p className="text-sm text-gray-900 flex items-center gap-1">
              👤 {ticket.requester_email}
            </p>
          </div>
          {ticket.updated_at && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                Last Updated
              </p>
              <p className="text-sm text-gray-900 flex items-center gap-1">
                ⏱️ {formatDate(ticket.updated_at)}
              </p>
            </div>
          )}
        </div>

        {/* Attachments */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
              📎 Attachments ({ticket.attachments.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {ticket.attachments.map((file, idx) => {
                // Use signed URL if available, otherwise show placeholder
                const signedUrl = signedUrls[file];
                const fileName = file.split("/").pop() || "attachment";

                return (
                  <a
                    key={idx}
                    href={signedUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors ${
                      !signedUrl ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={(e) => {
                      if (!signedUrl) {
                        e.preventDefault();
                        alert("Loading attachment URL...");
                      }
                    }}
                  >
                    <span>📄</span>
                    <span>{fileName}</span>
                    <span className="text-gray-400">↗</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Conversation section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
        <Comments
          ticketId={ticket.id}
          requesterEmail={ticket.requester_email}
        />
        <CommentForm ticketId={ticket.id} />
      </div>
    </div>
  );
}
