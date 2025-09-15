"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Comment = {
  id: string;
  author_email: string;
  content: string;
  created_at: string;
};

export default function Comments({ ticketId }: { ticketId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Load comments from Supabase
  const fetchComments = async () => {
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
  };

  useEffect(() => {
    fetchComments();
  }, [ticketId]);

  // Add a new comment
  const addComment = async () => {
    if (!newComment.trim()) return;

    setSending(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      alert("You must be logged in to comment.");
      setSending(false);
      return;
    }

    // Optimistically add comment to UI
    const optimisticComment: Comment = {
      id: crypto.randomUUID(),
      author_email: user.email,
      content: newComment,
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [...prev, optimisticComment]);
    setNewComment("");

    // Save comment to Supabase
    const { error } = await supabase.from("comments").insert([
      {
        ticket_id: ticketId,
        author_email: user.email,
        content: optimisticComment.content,
      },
    ]);

    if (error) {
      console.error("Error adding comment:", error.message);
      // Rollback if failed
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
      alert("Failed to add comment: " + error.message);
    } else {
      // Refetch to sync IDs from DB
      fetchComments();
    }

    setSending(false);
  };

  if (loading) return <p>Loading comments...</p>;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Comments</h3>

      {comments.length === 0 ? (
        <p>No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="border rounded p-3">
              <p className="text-sm text-gray-600 mb-1">
                {c.author_email} —{" "}
                {new Date(c.created_at).toLocaleString()}
              </p>
              <p>{c.content}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Form to add comment */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={addComment}
          disabled={sending}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
