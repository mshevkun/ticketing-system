"use client";

import TicketForm from "@/components/TicketForm";
import TicketList from "@/components/TicketList";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function TicketingSystemPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

  // Sign in with Microsoft
  const loginWithMicrosoft = async () => {
    // Get the current origin (works for both localhost and production)
    const redirectTo = `${window.location.origin}/ticketing-system`;

    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account", // Force account selection screen
        },
      },
    });
  };

  // Sign out
  const logout = async () => {
    await supabase.auth.signOut();
  };

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
                  {[
                    "cmansilla@people-usa.org",
                    "mshevkun@people-usa.org",
                  ].includes(userEmail)
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
          <div className="space-y-6 sm:space-y-8">
            {/* Form to create a new ticket */}
            <TicketForm />

            {/* List of tickets */}
            <TicketList />
          </div>
        )}
      </div>
    </main>
  );
}
