"use client";

import TicketForm from "@/components/TicketForm";
import TicketList from "@/components/TicketList";
import { supabase } from "@/lib/supabaseClient";
import { IT_EMAILS } from "@/lib/constants";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const AUTH_POPUP_PARAM = "auth";
const AUTH_POPUP_VALUE = "popup";

function TicketingSystemPageInner() {
  const searchParams = useSearchParams();
  const isAuthPopup = searchParams.get(AUTH_POPUP_PARAM) === AUTH_POPUP_VALUE;
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "tickets">("tickets");
  const [unreadIds, setUnreadIds] = useState<string[]>([]);
  const [isInIframe, setIsInIframe] = useState(false);
  const [popupStatus, setPopupStatus] = useState<"idle" | "redirecting" | "success">("idle");

  useEffect(() => {
    setIsInIframe(typeof window !== "undefined" && window.self !== window.top);
  }, []);

  // Get current user + subscribe to changes
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUserEmail(session?.user?.email ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // When opened as auth popup (?auth=popup): start OAuth or, after return, notify opener and close
  useEffect(() => {
    if (!isAuthPopup || typeof window === "undefined") return;

    const run = async () => {
      const hasHash = !!window.location.hash;
      if (hasHash) {
        setPopupStatus("success");
        // Return from OAuth: Supabase may still be processing the hash. Wait for session then notify opener and close.
        const waitForSession = (): Promise<void> =>
          new Promise((resolve) => {
            const check = async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                resolve();
                return;
              }
              setTimeout(check, 100);
            };
            check();
          });
        const timeout = new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Auth timeout")), 15000)
        );
        await Promise.race([waitForSession(), timeout]);
        try {
          window.opener?.postMessage({ type: "auth-complete" }, window.location.origin);
        } finally {
          window.close();
        }
        return;
      }
      setPopupStatus("redirecting");
      // First load in popup: start OAuth (redirect will happen in this window)
      const redirectTo = `${window.location.origin}/ticketing-system?${AUTH_POPUP_PARAM}=${AUTH_POPUP_VALUE}`;
      await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
      });
    };

    run();
  }, [isAuthPopup]);

  // Listen for auth-complete from popup (when we opened the popup from inside an iframe)
  useEffect(() => {
    if (typeof window === "undefined" || !isInIframe) return;
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "auth-complete") return;
      supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isInIframe]);

  // Sign in with Microsoft
  const loginWithMicrosoft = async () => {
    if (isInIframe) {
      // Teams / iframe: open OAuth in a popup so redirects work
      const popupUrl = `${window.location.origin}/ticketing-system?${AUTH_POPUP_PARAM}=${AUTH_POPUP_VALUE}`;
      const w = window.open(popupUrl, "auth", "width=600,height=600,scrollbars=yes");
      if (!w) {
        alert("Please allow popups for this site to sign in from Teams.");
      }
      return;
    }
    const redirectTo = `${window.location.origin}/ticketing-system`;
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  // Sign out
  const logout = async () => {
    await supabase.auth.signOut();
  };

  const fetchUnreadIds = useCallback(async () => {
    if (!userEmail) return;
    try {
      const res = await fetch(
        `/api/tickets/unread?userEmail=${encodeURIComponent(userEmail)}`
      );
      if (res.ok) {
        const { unreadIds: ids } = await res.json();
        setUnreadIds(ids || []);
      }
    } catch {
      // ignore
    }
  }, [userEmail]);

  useEffect(() => {
    if (userEmail) {
      fetchUnreadIds();
      const interval = setInterval(fetchUnreadIds, 30000);
      return () => clearInterval(interval);
    }
  }, [userEmail, fetchUnreadIds]);

  // Minimal UI when this tab is used as the auth popup
  if (isAuthPopup) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center max-w-sm">
          {popupStatus === "redirecting" && (
            <>
              <p className="text-gray-700 font-medium">Signing in…</p>
              <p className="text-sm text-gray-500 mt-2">You will be redirected to Microsoft login.</p>
            </>
          )}
          {popupStatus === "success" && (
            <>
              <p className="text-gray-700 font-medium">Success!</p>
              <p className="text-sm text-gray-500 mt-2">Closing this window…</p>
            </>
          )}
          {popupStatus === "idle" && (
            <p className="text-gray-600">Loading…</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2">
              <Image 
                src="/icons/people-usa-icon.png" 
                alt="People USA" 
                width={24}
                height={24}
                className="flex-shrink-0 sm:w-8 sm:h-8"
                unoptimized
              />
              <span className="hidden sm:inline">People USA IT Ticketing System</span>
              <span className="sm:hidden">IT Ticketing System</span>
            </h1>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mt-0.5">
              <span className="hidden sm:inline">Internal Help Desk System</span>
              <span className="sm:hidden">Help Desk</span>
            </p>
          </div>
          {userEmail && (
            <div className="flex flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-left sm:text-right min-w-0 flex-1 sm:flex-none">
                <p className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-900 truncate">
                  <span className="hidden sm:inline">Welcome, </span>
                  <span className="sm:hidden">Hi, </span>
                  <span className="hidden md:inline">{userEmail}</span>
                  <span className="md:hidden">{userEmail.split('@')[0]}</span>
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500">
                  {IT_EMAILS.includes(userEmail)
                    ? "IT Staff"
                    : "Employee"}
                </p>
              </div>
              <button
                onClick={logout}
                className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors text-[10px] sm:text-xs md:text-sm font-medium cursor-pointer flex-shrink-0"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex-1 flex items-center justify-center">
        {!userEmail ? (
          <div className="max-w-xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Welcome to IT Ticketing System
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Sign in with your Microsoft 365 account to create and manage IT
                support tickets
              </p>
              <button
                onClick={loginWithMicrosoft}
                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm hover:shadow-md cursor-pointer text-sm sm:text-base"
              >
                🔐 Login with Microsoft 365
              </button>

              <div className="mt-6">
                <div className="relative w-full min-h-[300px] overflow-hidden rounded-lg">
                  <Image
                    src="/images/associate.jpg"
                    alt="Associate"
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 100vw, 420px"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4 sm:mb-6">
              <button
                onClick={() => setActiveTab("create")}
                className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === "create"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                📋 Create Ticket
              </button>
              <button
                onClick={() => setActiveTab("tickets")}
                className={`relative px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === "tickets"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                🎫 Tickets
                {unreadIds.length > 0 && (
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"
                    title="Unread replies"
                    aria-hidden
                  />
                )}
              </button>
            </div>

            {/* Tab content */}
            {activeTab === "create" && <TicketForm />}
            {activeTab === "tickets" && (
              <TicketList
                unreadIds={unreadIds}
                onUnreadRefetch={fetchUnreadIds}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function TicketingSystemPageFallback() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Loading…</p>
    </main>
  );
}

export default function TicketingSystemPage() {
  return (
    <Suspense fallback={<TicketingSystemPageFallback />}>
      <TicketingSystemPageInner />
    </Suspense>
  );
}
