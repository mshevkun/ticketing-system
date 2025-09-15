"use client";

import TicketForm from "@/components/TicketForm";
import TicketList from "@/components/TicketList";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

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
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: "http://localhost:3000/ticketing-system", // your redirect
      },
    });
  };

  // Sign out
  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">Ticketing System</h1>

      {!userEmail ? (
        <button
          onClick={loginWithMicrosoft}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Login with Microsoft
        </button>
      ) : (
        <div className="space-y-6">
          <p>Welcome, {userEmail}</p>

          {/* Form to create a new ticket */}
          <TicketForm />

          {/* List of tickets */}
          <TicketList />

          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-600 text-white rounded"
          >
            Logout
          </button>
        </div>
      )}
    </main>
  );
}
