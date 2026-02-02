"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

type Comment = {
  id: string;
  author_email: string;
  content: string;
  created_at: string;
  attachments?: string[] | null;
};

const IT_EMAILS = ["cmansilla@people-usa.org", "mshevkun@people-usa.org"];

export default function Comments({
  ticketId,
  requesterEmail,
}: {
  ticketId: string;
  requesterEmail?: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [signedUrlsByComment, setSignedUrlsByComment] = useState<Record<string, Record<string, string>>>({});
  const [removingAttachment, setRemovingAttachment] = useState<string | null>(null);
  const containerRef = useRef<HTMLUListElement | null>(null);

  // Load comments from Supabase (include attachments)
  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("id, author_email, content, created_at, attachments")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error.message);
      setComments([]);
    } else {
      setComments(data || []);
      // Fetch signed URLs for comments that have attachments
      const withAttachments = (data || []).filter(
        (c) => c.attachments && Array.isArray(c.attachments) && c.attachments.length > 0
      );
      const urls: Record<string, Record<string, string>> = {};
      await Promise.all(
        withAttachments.map(async (c) => {
          try {
            const res = await fetch(`/api/comments/${c.id}/attachments`);
            if (res.ok) {
              const { urls: commentUrls } = await res.json();
              urls[c.id] = commentUrls || {};
            }
          } catch {
            // ignore
          }
        })
      );
      setSignedUrlsByComment(urls);
    }
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    fetchComments();
  }, [ticketId, fetchComments]);

  // Get current user email for "You" label
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserEmail(data.user?.email ?? null);
    };
    getUser();
  }, []);

  // Listen for comment added events to refresh
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail === ticketId) fetchComments();
    };
    window.addEventListener("comment:added", handler);
    return () => window.removeEventListener("comment:added", handler);
  }, [ticketId, fetchComments]);

  // Auto-scroll to bottom when comments change
  useEffect(() => {
    if (!containerRef.current) return;
    // Small timeout to wait for DOM update
    const t = setTimeout(() => {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 50);
    return () => clearTimeout(t);
  }, [comments]);

  // Note: inline addComment UI removed; use CommentForm component on the page.

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes === 1) return "1 minute ago";
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const handleRemoveCommentAttachment = async (commentId: string, filePath: string) => {
    if (!currentUserEmail) return;
    setRemovingAttachment(filePath);
    try {
      const res = await fetch(`/api/comments/${commentId}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: currentUserEmail, filePath }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove attachment");
      }
      await fetchComments();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setRemovingAttachment(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-200 rounded-lg"></div>
        <div className="h-20 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
        💬 Conversation{" "}
        {comments.length > 0 && (
          <span className="text-xs sm:text-sm font-normal text-gray-500">
            ({comments.length} {comments.length === 1 ? "message" : "messages"})
          </span>
        )}
      </h3>

      {comments.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-gray-500">
          <div className="text-2xl sm:text-3xl mb-2">💭</div>
          <p className="text-xs sm:text-sm">
            No messages yet. Start the conversation!
          </p>
        </div>
      ) : (
        <ul ref={containerRef} className="space-y-3 sm:space-y-4">
          {comments.map((c) => {
            const isRequester = requesterEmail
              ? c.author_email === requesterEmail
              : false;
            const isAdmin = IT_EMAILS.includes(c.author_email);
            // requester messages on the left, admin messages on the right
            const justifyClass = isAdmin ? "justify-end" : "justify-start";
            // Outline style: white background with colored borders
            const bubbleClass = isAdmin
              ? "bg-white text-gray-900 rounded-xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm border-2 border-orange-300 max-w-full sm:max-w-xl"
              : isRequester
              ? "bg-white text-gray-900 rounded-xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm border-2 border-blue-300 max-w-full sm:max-w-xl"
              : "bg-white text-gray-900 rounded-xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm border border-gray-300 max-w-full sm:max-w-xl";

            return (
              <li key={c.id}>
                <div className={`flex ${justifyClass} items-start gap-3`}>
                  {!isAdmin && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center text-sm font-medium text-gray-700">
                      {getInitials(c.author_email)}
                    </div>
                  )}
                  <div className={isAdmin ? "" : "flex-1"}>
                    <div className={bubbleClass}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-700">
                          {isAdmin
                            ? `🔧 IT Staff (${c.author_email})`
                            : c.author_email}
                        </span>
                        {currentUserEmail === c.author_email && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-full">
                            You
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatTime(c.created_at)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-900">
                        {c.content}
                      </p>
                      {c.attachments && c.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {c.attachments.map((path, idx) => {
                            const signedUrls = signedUrlsByComment[c.id] || {};
                            const url = signedUrls[path];
                            const fileName = path.split("/").pop() || "file";
                            const email = currentUserEmail;
                            const canRemove =
                              email !== null &&
                              (email === c.author_email || IT_EMAILS.includes(email));
                            const isRemoving = removingAttachment === path;
                            return (
                              <div
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                              >
                                <a
                                  href={url || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline truncate max-w-[140px]"
                                  onClick={(e) => !url && e.preventDefault()}
                                >
                                  📄 {fileName}
                                </a>
                                {canRemove && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCommentAttachment(c.id, path)}
                                    disabled={isRemoving}
                                    className="text-red-600 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                                    title="Remove attachment"
                                  >
                                    {isRemoving ? "…" : "✕"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 border-2 border-orange-300 flex items-center justify-center text-sm font-medium text-gray-700">
                      {getInitials(c.author_email)}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
