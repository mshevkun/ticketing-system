/**
 * IT staff emails with permission to manage all tickets and update status.
 * Update this list to add or remove IT staff.
 */
export const IT_EMAILS: readonly string[] = [
  "cmansilla@people-usa.org",
  "mshevkun@people-usa.org",
];

/**
 * Base URL for email links (e.g. "View your ticket").
 * Must be the public production URL so recipients are not sent to Vercel preview/auth.
 * Set NEXT_PUBLIC_APP_URL in Vercel (e.g. https://tickets.people-usa.org); do not rely on VERCEL_URL for emails.
 */
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://tickets.people-usa.org";

/** Full URL to view a ticket (used in notification emails). */
export function getTicketViewUrl(ticketId: string): string {
  return `${APP_BASE_URL}/ticketing-system/tickets/${ticketId}`;
}
