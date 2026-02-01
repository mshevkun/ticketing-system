"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import StatusBadge from "./StatusBadge";

const IT_EMAILS = ["cmansilla@people-usa.org", "mshevkun@people-usa.org"];

type Ticket = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  requester_email: string;
  department_program?: string;
  supervisor?: string;
  attachments: string[] | null;
  created_at?: string;
};

export default function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    };
    getUser();
  }, []);

  const fetchTickets = useCallback(async () => {
    if (!userEmail) return;

    setLoading(true);

    let query = supabase.from("tickets").select("*").order("created_at", {
      ascending: false,
    });

    if (!IT_EMAILS.includes(userEmail)) {
      query = query.eq("requester_email", userEmail);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching tickets:", error.message);
      setTickets([]);
    } else {
      setTickets(data || []);
    }

    setLoading(false);
  }, [userEmail]);

  useEffect(() => {
    if (userEmail) fetchTickets();
  }, [userEmail, fetchTickets]);

  useEffect(() => {
    const handler = () => fetchTickets();
    window.addEventListener("ticket:created", handler);
    return () => window.removeEventListener("ticket:created", handler);
  }, [userEmail, fetchTickets]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-4xl mx-auto p-0 sm:p-4">
      <h2 className="text-xl sm:text-2xl font-semibold mb-1 px-4 sm:px-0">
        {IT_EMAILS.includes(userEmail || "") ? "All Tickets" : "My Tickets"}
      </h2>
      <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 px-4 sm:px-0">Track and manage your IT support requests</p>

      {tickets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 sm:p-12 text-center shadow-sm mx-4 sm:mx-0">
          <div className="flex justify-center mb-4">
            <Image 
              src="/icons/people-usa-icon.png" 
              alt="People USA" 
              width={64} 
              height={64}
              className="w-12 h-12 sm:w-16 sm:h-16"
            />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
          <p className="text-xs sm:text-sm text-gray-600">
            {IT_EMAILS.includes(userEmail || "")
              ? "No tickets have been created yet."
              : "You don't have any tickets yet. Create your first ticket above."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2 sm:space-y-3 px-4 sm:px-0">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/ticketing-system/tickets/${t.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 sm:p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2 sm:gap-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors flex-1 pr-2 sm:pr-4">
                    📋 {t.title}
                  </h3>
                  <StatusBadge status={t.status} size="sm" />
                </div>
                <p className="text-xs sm:text-sm text-gray-700 mb-3 line-clamp-2">{t.description}</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="font-medium">🏷️</span> {t.category}
                  </span>
                  {t.attachments && t.attachments.length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium">📎</span> {t.attachments.length} file{t.attachments.length > 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="hidden sm:flex items-center gap-1">
                    <span className="font-medium">👤</span> <span className="truncate max-w-[150px]">{t.requester_email}</span>
                  </span>
                  {t.created_at && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium">📅</span> {formatDate(t.created_at)}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
