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

    const go = (url: string) => {
      redirectDone.current = true;
      window.location.replace(url);
    };

    const establishAndRedirect = () => {
      if (path.startsWith(TICKET_PATH_PREFIX)) {
        const separator = path.includes("?") ? "&" : "?";
        go(`${path}${separator}${FROM_SIGNIN_QUERY}`);
      } else {
        go(DEFAULT_REDIRECT);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "INITIAL_SESSION" || (event === "SIGNED_IN" && session)) {
          authListener.subscription.unsubscribe();
          establishAndRedirect();
        }
      },
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        authListener.subscription.unsubscribe();
        establishAndRedirect();
      }
    });
    const fallback = setTimeout(() => {
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
