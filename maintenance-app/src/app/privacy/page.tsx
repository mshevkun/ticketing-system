import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - People USA Maintenance Ticketing System",
  description: "Privacy policy for the People USA Maintenance Ticketing System",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Link
          href="/maintenance-system"
          className="text-sm text-blue-600 hover:text-blue-800 mb-6 inline-block"
        >
          ← Back to Maintenance Ticketing System
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          People USA Maintenance Ticketing System · Last updated: February 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              1. Introduction
            </h2>
            <p>
              People USA operates the Maintenance Ticketing System at maintenance.people-usa.org.
              This Privacy Policy describes how we collect, use, and protect
              information when you use this internal application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              2. Information We Collect
            </h2>
            <p>
              When you use the Maintenance Ticketing System, we collect information you
              provide directly: your name and email (from Microsoft 365), ticket
              details (title, description, category, attachments), comments and
              messages, and metadata such as timestamps and ticket status.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              3. How We Use Your Information
            </h2>
            <p>
              We use this information to process and manage maintenance requests,
              communicate with you about your tickets, send email notifications
              (e.g., status updates, new replies), improve our internal support
              processes, and comply with organizational policies and applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              4. Data Sharing and Access
            </h2>
            <p>
              Ticket and user data are accessible only to authorized personnel
              (maintenance staff and the ticket creator) within the organization. We do
              not sell or share your information with third parties for
              marketing. Data may be shared with service providers (e.g., hosting,
              email) solely to operate the system.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              5. Data Retention and Security
            </h2>
            <p>
              We retain ticket and comment data as needed for support and
              record-keeping. We implement appropriate measures to protect your
              data against unauthorized access, loss, or alteration.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              6. Your Rights and Contact
            </h2>
            <p>
              You may request access to, correction of, or deletion of your
              personal data, subject to applicable policy and law. For questions
              about this Privacy Policy, contact your organization&apos;s IT
              department or People USA administration.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-gray-500">
          © People USA. This policy applies to the Maintenance Ticketing System at maintenance.people-usa.org.
        </p>
      </div>
    </main>
  );
}
