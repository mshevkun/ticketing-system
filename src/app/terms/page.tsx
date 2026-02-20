import Link from "next/link";

export const metadata = {
  title: "Terms of Use - People USA IT Ticketing System",
  description: "Terms of use for the People USA IT Ticketing System",
};

export default function TermsOfUsePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Link
          href="/ticketing-system"
          className="text-sm text-blue-600 hover:text-blue-800 mb-6 inline-block"
        >
          ← Back to IT Ticketing System
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Terms of Use
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          People USA IT Ticketing System · Last updated: February 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the People USA IT Ticketing System
              (&quot;the System&quot;) at tickets.people-usa.org, you agree to
              these Terms of Use. If you do not agree, do not use the System.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              2. Purpose and Use
            </h2>
            <p>
              The System is an internal tool for submitting and managing IT
              support requests. You may use it only for work-related support
              needs and in accordance with your organization&apos;s policies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              3. Acceptable Use
            </h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Provide accurate information when creating tickets and comments</li>
              <li>Use the System only for legitimate IT support requests</li>
              <li>Not submit malicious content, spam, or unauthorized file types</li>
              <li>Respect confidentiality of tickets and communications</li>
              <li>Comply with all applicable organizational and IT policies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              4. Access and Accounts
            </h2>
            <p>
              Access to the System is granted through your organization&apos;s
              Microsoft 365 account. You are responsible for maintaining the
              security of your credentials and for all activity under your
              account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              5. Intellectual Property and Data
            </h2>
            <p>
              The System and its design are owned by People USA or its
              licensors. Content you submit (tickets, comments, attachments)
              remains subject to your organization&apos;s data and intellectual
              property policies. We may use and store this data to operate the
              System and as described in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              6. Availability and Modifications
            </h2>
            <p>
              We strive to keep the System available but do not guarantee
              uninterrupted access. We may modify, suspend, or discontinue
              features with reasonable notice where possible. We may also update
              these Terms; continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              7. Limitation of Liability
            </h2>
            <p>
              The System is provided &quot;as is.&quot; To the extent permitted
              by law, People USA and its affiliates are not liable for indirect,
              incidental, or consequential damages arising from your use of the
              System.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              8. Contact
            </h2>
            <p>
              For questions about these Terms of Use, contact your
              organization&apos;s IT department or People USA administration.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-gray-500">
          © People USA. These terms apply to the IT Ticketing System offered at
          tickets.people-usa.org.
        </p>
      </div>
    </main>
  );
}
