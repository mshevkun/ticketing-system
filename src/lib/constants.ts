/**
 * IT staff emails with permission to manage all tickets and update status.
 * Update this list to add or remove IT staff.
 */
export const IT_EMAILS: readonly string[] = [
  "cmansilla@people-usa.org",
  "mshevkun@people-usa.org",
];

/** Base URL of the ticketing app (for links in emails). Set NEXT_PUBLIC_APP_URL in production. */
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://tickets.people-usa.org");

/** Full URL to view a ticket (used in notification emails). */
export function getTicketViewUrl(ticketId: string): string {
  return `${APP_BASE_URL}/ticketing-system/tickets/${ticketId}`;
}
