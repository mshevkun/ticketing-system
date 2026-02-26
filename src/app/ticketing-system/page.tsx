"use client";

import TicketForm from "@/components/TicketForm";
import TicketList from "@/components/TicketList";
import { supabase } from "@/lib/supabaseClient";
import { IT_EMAILS } from "@/lib/constants";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

const AUTH_REDIRECT_PARAM = "auth";
const AUTH_REDIRECT_VALUE = "redirect";
const RETURN_TO_KEY = "ticketingReturnTo";
const FROM_SIGNIN_PARAM = "from=signin";

function TicketingSystemPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isAuthRedirect =
    searchParams.get(AUTH_REDIRECT_PARAM) === AUTH_REDIRECT_VALUE;

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "tickets">("tickets");
  const [unreadIds, setUnreadIds] = useState<string[]>([]);
  const [isInIframe, setIsInIframe] = useState(false);
  const authRedirectStarted = useRef(false);

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
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // When opened from Teams with ?auth=redirect: go straight to Microsoft sign-in (no login button screen).
  useEffect(() => {
    if (
      !isAuthRedirect ||
      userEmail !== null ||
      typeof window === "undefined" ||
      authRedirectStarted.current
    )
      return;
    authRedirectStarted.current = true;
    const redirectTo = `${window.location.origin}/ticketing-system`;
    supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    });
  }, [isAuthRedirect, userEmail]);

  // After sign-in, redirect back to the ticket page if user came from ticket sign-in banner
  useEffect(() => {
    if (typeof window === "undefined" || !userEmail) return;
    const returnTo = sessionStorage.getItem(RETURN_TO_KEY);
    if (!returnTo) return;
    sessionStorage.removeItem(RETURN_TO_KEY);
    const path = returnTo.startsWith("/") ? returnTo : `/${returnTo}`;
    if (path.startsWith("/ticketing-system/tickets/")) {
      const separator = path.includes("?") ? "&" : "?";
      router.replace(`${path}${separator}${FROM_SIGNIN_PARAM}`);
    }
  }, [userEmail, router]);

  // Sign in with Microsoft. In Teams (iframe) we open the app in browser with ?auth=redirect so it goes straight to Microsoft login.
  const loginWithMicrosoft = async () => {
    if (isInIframe) {
      const url = `${window.location.origin}/ticketing-system?${AUTH_REDIRECT_PARAM}=${AUTH_REDIRECT_VALUE}`;
      window.open(url, "_blank", "noopener,noreferrer");
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
        `/api/tickets/unread?userEmail=${encodeURIComponent(userEmail)}`,
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
              <span className="hidden sm:inline">
                People USA IT Ticketing System
              </span>
              <span className="sm:hidden">IT Ticketing System</span>
            </h1>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mt-0.5">
              <span className="hidden sm:inline">
                Internal Help Desk System
              </span>
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
                  <span className="md:hidden">{userEmail.split("@")[0]}</span>
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500">
                  {IT_EMAILS.includes(userEmail) ? "IT Staff" : "Employee"}
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
        {isAuthRedirect && !userEmail ? (
          <div className="max-w-xl mx-auto text-center">
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
              <p className="text-gray-700 font-medium">
                Redirecting to Microsoft sign-in…
              </p>
              <p className="text-sm text-gray-500 mt-2">
                You will return here after signing in.
              </p>
            </div>
          </div>
        ) : !userEmail ? (
          <div className="max-w-xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Welcome to IT Ticketing System
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                {isInIframe
                  ? "Open the app in your browser to sign in with Microsoft 365 and use the ticketing system."
                  : "Sign in with your Microsoft 365 account to create and manage IT support tickets"}
              </p>
              <button
                onClick={loginWithMicrosoft}
                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm hover:shadow-md cursor-pointer text-sm sm:text-base"
              >
                {isInIframe
                  ? "Open in browser to sign in"
                  : "🔐 Login with Microsoft 365"}
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

function PageFallback() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Loading…</p>
    </main>
  );
}

export default function TicketingSystemPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <TicketingSystemPageInner />
    </Suspense>
  );
}
