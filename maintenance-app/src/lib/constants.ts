/**
 * Maintenance staff emails with permission to manage all tickets and update status.
 * Update this list to add or remove maintenance staff.
 */
export const MAINTENANCE_EMAILS: readonly string[] = [
  "syoung@people-usa.org",
  "mshevkun@people-usa.org",
];

/**
 * Base URL for email links (e.g. "View your ticket").
 * Must be the public production URL so recipients are not sent to Vercel preview/auth.
 * Set NEXT_PUBLIC_APP_URL in Vercel (e.g. https://maintenance.people-usa.org); do not rely on VERCEL_URL for emails.
 */
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://maintenance-tickets.people-usa.org";

/** Full URL to view a ticket (used in notification emails). */
export function getMaintenanceTicketViewUrl(ticketId: string): string {
  return `${APP_BASE_URL}/maintenance-system/tickets/${ticketId}`;
}
