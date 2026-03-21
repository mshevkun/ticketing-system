"use client";

import Image from "next/image";
import { useEffect } from "react";

const TEAMS_SDK_URL =
  "https://res.cdn.office.net/teams-js/sdk/2.0.0/js/MicrosoftTeams.min.js";

declare global {
  interface Window {
    microsoftTeams?: {
      app: {
        initialize: () => Promise<void>;
      };
    };
  }
}

type TeamsLandingPageProps = {
  title: string;
  description: string;
  buttonLabel: string;
  externalUrl: string;
  iconSrc: string;
  iconAlt: string;
};

export default function TeamsLandingPage({
  title,
  description,
  buttonLabel,
  externalUrl,
  iconSrc,
  iconAlt,
}: TeamsLandingPageProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.parent === window) return; // Not in iframe (e.g. not Teams)

    const script = document.createElement("script");
    script.src = TEAMS_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.microsoftTeams?.app) {
        window.microsoftTeams.app.initialize().catch(() => {});
      }
    };
    document.head.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  const handleOpenPortal = () => {
    if (!externalUrl) return;
    window.open(externalUrl, "_blank", "noopener,noreferrer");
  };

  const hasUrl = !!externalUrl?.trim();

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl">
        <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm text-center">
          <div className="flex justify-center mb-4">
            <Image
              src={iconSrc}
              alt={iconAlt}
              width={64}
              height={64}
              className="object-contain"
              unoptimized
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            {description}
          </p>
          <button
            onClick={handleOpenPortal}
            disabled={!hasUrl}
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {hasUrl ? buttonLabel : "Portal URL not configured"}
          </button>
        </div>
      </div>
    </main>
  );
}
