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
      alert("You must be logged in to send a message.");
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
      console.error("Error adding message:", error.message);
      alert("Failed to send message.");
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
    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
      <label htmlFor="comment-input" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
        Add a message
      </label>
      <div className="flex flex-col sm:flex-row items-end gap-2 sm:gap-3">
        <textarea
          id="comment-input"
          placeholder="Type your message here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              addComment();
            }
          }}
          className="flex-1 w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-y min-h-[80px]"
          rows={3}
        />
        <button
          onClick={addComment}
          disabled={sending || !content.trim()}
          className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md font-medium text-xs sm:text-sm cursor-pointer"
        >
          {sending ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span> Sending...
            </span>
          ) : (
            "💬 Send Message"
          )}
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500 hidden sm:block">
        Press Cmd/Ctrl + Enter to send quickly
      </p>
    </div>
  );
}
