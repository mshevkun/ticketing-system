"use client";

import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

const TICKET_PATH_PREFIX = "/ticketing-system/tickets/";
const DEFAULT_REDIRECT = "/ticketing-system";
const FROM_SIGNIN_QUERY = "from=signin";

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const redirectDone = useRef(false);

  useEffect(() => {
    if (redirectDone.current || typeof window === "undefined") return;

    const nextRaw = searchParams.get("next");
    const path = nextRaw
      ? (nextRaw.startsWith("/") ? nextRaw : `/${nextRaw}`)
      : "";

    console.log("[Auth callback] Page loaded:", {
      href: typeof window !== "undefined" ? window.location.href : "",
      search: typeof window !== "undefined" ? window.location.search : "",
      nextRaw,
      path,
      hasHash: typeof window !== "undefined" ? !!window.location.hash : false,
    });

    const go = (url: string) => {
      redirectDone.current = true;
      console.log("[Auth callback] Redirecting to:", url);
      window.location.replace(url);
    };

    const establishAndRedirect = () => {
      if (path.startsWith(TICKET_PATH_PREFIX)) {
        const separator = path.includes("?") ? "&" : "?";
        go(`${path}${separator}${FROM_SIGNIN_QUERY}`);
      } else {
        console.log("[Auth callback] No ticket path, going to list. path:", path);
        go(DEFAULT_REDIRECT);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[Auth callback] onAuthStateChange:", event, !!session);
        if (event === "INITIAL_SESSION" || (event === "SIGNED_IN" && session)) {
          authListener.subscription.unsubscribe();
          establishAndRedirect();
        }
      },
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[Auth callback] getSession result:", !!session);
      if (session) {
        authListener.subscription.unsubscribe();
        establishAndRedirect();
      }
    });
    const fallback = setTimeout(() => {
      console.log("[Auth callback] Fallback timeout (3s), redirecting anyway");
      authListener.subscription.unsubscribe();
      establishAndRedirect();
    }, 3000);
    return () => clearTimeout(fallback);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">Signing you in and redirecting…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-600">Loading…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
