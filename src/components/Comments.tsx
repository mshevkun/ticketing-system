"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

type Comment = {
  id: string;
  author_email: string;
  content: string;
  created_at: string;
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
  const containerRef = useRef<HTMLUListElement | null>(null);

  // Load comments from Supabase
  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("id, author_email, content, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error.message);
    } else {
      setComments(data || []);
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

  if (loading) return <p>Loading comments...</p>;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Comments</h3>

      {comments.length === 0 ? (
        <p>No comments yet.</p>
      ) : (
        <ul ref={containerRef} className="space-y-3">
          {comments.map((c) => {
            const isRequester = requesterEmail
              ? c.author_email === requesterEmail
              : false;
            const isAdmin = IT_EMAILS.includes(c.author_email);
            // requester messages on the left, admin messages on the right
            const justifyClass = isAdmin ? "justify-end" : "justify-start";
            // requester: light blue; admin: orange; others: gray
            const bubbleClass = isAdmin
              ? "bg-orange-500 text-white rounded-xl px-5 py-3 shadow-sm max-w-xl"
              : isRequester
              ? "bg-blue-50 text-blue-900 rounded-xl px-5 py-3 shadow-sm border border-blue-100 max-w-xl"
              : "bg-gray-50 text-gray-900 rounded-xl px-5 py-3 shadow-sm border border-gray-100 max-w-xl";

            return (
              <li key={c.id} className="">
                <div className={`flex ${justifyClass}`}>
                  <div className={bubbleClass}>
                    <p className="text-xs text-gray-500 mb-2">
                      <span className="font-medium text-[0.75rem] text-gray-700">
                        {c.author_email}
                      </span>
                      {currentUserEmail === c.author_email ? (
                        <span className="ml-2 text-sm text-gray-500">
                          (You)
                        </span>
                      ) : null}
                      <span className="mx-2 text-gray-300">•</span>
                      <span className="text-xs text-gray-500">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </p>
                    <p className="text-sm leading-snug">{c.content}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Inline comment input removed — use CommentForm component on the page */}
    </div>
  );
}
