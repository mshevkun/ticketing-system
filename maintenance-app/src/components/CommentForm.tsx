"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CommentForm({ ticketId }: { ticketId: string }) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

    try {
      const formData = new FormData();
      formData.append("ticket_id", ticketId);
      formData.append("author_email", user.email);
      formData.append("content", content.trim());
      selectedFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      const res = await fetch("/api/comments", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message");
      }

      window.dispatchEvent(
        new CustomEvent("comment:added", { detail: ticketId })
      );
      setContent("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.min(2, Math.floor(Math.log(bytes) / Math.log(k)));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
      <label htmlFor="comment-input" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
        Add a message
      </label>
      <div className="flex flex-col gap-2 sm:gap-3">
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
          className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-y min-h-[80px]"
          rows={3}
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 cursor-pointer">
            <span>📎</span>
            <span>Attach files</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedFiles.map((file, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs"
                >
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <span className="text-gray-500">({formatFileSize(file.size)})</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-red-600 hover:text-red-700 cursor-pointer"
                    aria-label="Remove file"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-2 sm:gap-3">
          <button
            onClick={addComment}
            disabled={sending || !content.trim()}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md font-medium text-xs sm:text-sm cursor-pointer"
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Sending...
              </span>
            ) : (
              "💬 Send Message"
            )}
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500 hidden sm:block">
        Press Cmd/Ctrl + Enter to send quickly
      </p>
    </div>
  );
}
