"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Comments from "@/components/Comments";
import CommentForm from "@/components/CommentForm";
import StatusBadge from "@/components/StatusBadge";
import { MAINTENANCE_EMAILS } from "@/lib/constants";

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
  department_program?: string;
  supervisor?: string;
  attachments: string[] | null;
};

export default function TicketPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);
  const [addingAttachments, setAddingAttachments] = useState(false);
  const [removingAttachment, setRemovingAttachment] = useState<string | null>(
    null,
  );
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescriptionValue, setEditDescriptionValue] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);
  const ticketAttachmentInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch current user email and subscribe to auth changes (e.g. after sign-in redirect)
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
      setAuthChecked(true);
    };
    getUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load ticket details from Supabase
  const fetchTicket = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("maintenance_tickets")
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

  // Mark ticket as read when user views it
  useEffect(() => {
    if (!ticket || !userEmail || loading) return;

    const markRead = async () => {
      try {
        await fetch(`/api/tickets/${id}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail }),
        });
      } catch {
        // ignore
      }
    };
    markRead();
  }, [id, ticket, userEmail, loading]);

  const canEditTicket =
    userEmail &&
    (MAINTENANCE_EMAILS.includes(userEmail) || ticket?.requester_email === userEmail);

  const handleAddAttachments = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!ticket || !userEmail || !e.target.files?.length) return;
    const files = Array.from(e.target.files);
    setAddingAttachments(true);
    try {
      const formData = new FormData();
      formData.append("userEmail", userEmail);
      files.forEach((file) => formData.append("attachments", file));
      const res = await fetch(`/api/tickets/${id}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add attachments");
      }
      await fetchTicket();
      if (ticketAttachmentInputRef.current)
        ticketAttachmentInputRef.current.value = "";
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setAddingAttachments(false);
    }
  };

  const handleRemoveAttachment = async (filePath: string) => {
    if (!ticket || !userEmail) return;
    setRemovingAttachment(filePath);
    try {
      const res = await fetch(`/api/tickets/${id}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, filePath }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove attachment");
      }
      await fetchTicket();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setRemovingAttachment(null);
    }
  };

  // Delete ticket handler
  const handleDelete = async () => {
    if (!ticket || !userEmail) return;

    // Check if user has permission
    const isITStaff = MAINTENANCE_EMAILS.includes(userEmail);
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
      router.push("/maintenance-system");
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
            onClick={() => router.push("/maintenance-system")}
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

  const handleSignIn = () => {
    const redirectTo =
      typeof window !== "undefined" ? window.location.href : "";
    if (!redirectTo) return;
    supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/maintenance-system")}
        className="mb-4 sm:mb-6 text-xs sm:text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors cursor-pointer"
      >
      <span>←</span> Back to Requests
      </button>

      {/* Sign-in prompt when not logged in (e.g. arrived from email link) */}
      {authChecked && !userEmail && ticket && (
        <div className="mb-4 sm:mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-5 shadow-sm">
          <p className="text-sm sm:text-base text-blue-900 font-medium mb-2">
            Sign in to reply, update status, and manage this request
          </p>
          <p className="text-xs sm:text-sm text-blue-700 mb-4">
            You can view the ticket below. Sign in with your Microsoft 365
            account to add messages, change status, or edit the ticket.
          </p>
          <button
            type="button"
            onClick={handleSignIn}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
          >
            Sign in with Microsoft 365
          </button>
        </div>
      )}

      {/* Ticket Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3 sm:gap-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 break-words">
              🔧 {ticket.title}
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
            {/* Delete button - visible to creator or maintenance staff */}
            {(MAINTENANCE_EMAILS.includes(userEmail || "") ||
              ticket.requester_email === userEmail) && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-red-600 bg-white border border-red-300 rounded-full hover:bg-red-50 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-sm hover:shadow whitespace-nowrap"
                title={
                  MAINTENANCE_EMAILS.includes(userEmail || "")
                    ? "Delete this request (maintenance staff)"
                    : "Delete your request"
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

        {/* Description — editable by ticket creator only */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-700">
              Description
            </h3>
            {ticket.requester_email === userEmail && !editingDescription && (
              <button
                type="button"
                onClick={() => {
                  setEditDescriptionValue(ticket.description);
                  setEditingDescription(true);
                }}
                className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-2 py-1"
              >
                Edit
              </button>
            )}
          </div>
          {editingDescription ? (
            <div className="space-y-2">
              <textarea
                value={editDescriptionValue}
                onChange={(e) => setEditDescriptionValue(e.target.value)}
                className="w-full text-sm sm:text-base text-gray-900 whitespace-pre-wrap bg-white p-3 sm:p-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px]"
                placeholder="Description..."
                disabled={savingDescription}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const trimmed = editDescriptionValue.trim();
                    if (trimmed.length < 5) {
                      alert("Description must be at least 5 characters.");
                      return;
                    }
                    if (!userEmail) return;
                    setSavingDescription(true);
                    try {
                      const res = await fetch(`/api/tickets/${id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userEmail,
                          description: trimmed,
                        }),
                      });
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(
                          data.error || "Failed to update description",
                        );
                      }
                      setTicket((prev) =>
                        prev ? { ...prev, description: trimmed } : null,
                      );
                      setEditingDescription(false);
                    } catch (err) {
                      alert(err instanceof Error ? err.message : String(err));
                    } finally {
                      setSavingDescription(false);
                    }
                  }}
                  disabled={savingDescription}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {savingDescription ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDescription(false);
                    setEditDescriptionValue(ticket.description);
                  }}
                  disabled={savingDescription}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm sm:text-base text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
              {ticket.description}
            </p>
          )}
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
              Department / Location
            </p>
            <p className="text-sm text-gray-900 flex items-center gap-1">
              🏢 {ticket.department_program?.trim() || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              Supervisor
            </p>
            <p className="text-sm text-gray-900 flex items-center gap-1">
              👤 {ticket.supervisor?.trim() || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              Status
            </p>
            <div className="flex items-center gap-1">
              {MAINTENANCE_EMAILS.includes(userEmail || "") ? (
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
                          body?.error || "Failed to update status",
                        );
                      }

                      setTicket(
                        (prev) => prev && { ...prev, status: newStatus },
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
            <p
              className="text-sm text-gray-900 flex items-center gap-1 truncate"
              title={ticket.requester_email}
            >
              📧 {ticket.requester_email}
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
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
            📎 Attachments{" "}
            {ticket.attachments?.length ? `(${ticket.attachments.length})` : ""}
          </h3>
          {ticket.attachments && ticket.attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {ticket.attachments.map((file, idx) => {
                const signedUrl = signedUrls[file];
                const fileName = file.split("/").pop() || "attachment";
                const isRemoving = removingAttachment === file;

                return (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-700"
                  >
                    <a
                      href={signedUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`hover:bg-gray-100 hover:border-gray-300 transition-colors rounded ${
                        !signedUrl ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      onClick={(e) => !signedUrl && e.preventDefault()}
                    >
                      <span>📄</span>
                      <span>{fileName}</span>
                      <span className="text-gray-400">↗</span>
                    </a>
                    {canEditTicket && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(file)}
                        disabled={isRemoving}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50 cursor-pointer ml-0.5"
                        title="Remove attachment"
                      >
                        {isRemoving ? "…" : "✕"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-500 mb-2">No attachments yet.</p>
          )}
          {canEditTicket && (
            <div className="flex items-center gap-2">
              <input
                ref={ticketAttachmentInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleAddAttachments}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => ticketAttachmentInputRef.current?.click()}
                disabled={addingAttachments}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 cursor-pointer"
              >
                {addingAttachments ? (
                  <>
                    <span className="animate-spin">⏳</span> Adding...
                  </>
                ) : (
                  <>
                    <span>📎</span> Add attachments
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Conversation section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
        <Comments
          ticketId={ticket.id}
          requesterEmail={ticket.requester_email}
        />
        {userEmail ? (
          <CommentForm ticketId={ticket.id} />
        ) : (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-3">
              Sign in to add a message or attach files.
            </p>
            <button
              type="button"
              onClick={handleSignIn}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
            >
              Sign in with Microsoft 365
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
