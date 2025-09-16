"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CommentForm({ ticketId }: { ticketId: string }) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const addComment = async () => {
    if (!content.trim()) return;

    setSending(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      alert("You must be logged in to comment.");
      setSending(false);
      return;
    }

    const { error } = await supabase.from("comments").insert([
      {
        ticket_id: ticketId,
        author_email: user.email,
        content,
      },
    ]);

    if (error) {
      console.error("Error adding comment:", error.message);
      alert("Failed to add comment.");
    } else {
      // notify Comments.tsx to refetch
      window.dispatchEvent(
        new CustomEvent("comment:added", { detail: ticketId })
      );
      setContent("");
    }

    setSending(false);
  };

  return (
    <div className="mt-6 flex items-center gap-3 max-w-3xl">
      <input
        type="text"
        placeholder="Write a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 border border-gray-300 rounded px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      <button
        onClick={addComment}
        disabled={sending}
        className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 shadow cursor-button"
      >
        {sending ? "Sending..." : "Send"}
      </button>
    </div>
  );
}
