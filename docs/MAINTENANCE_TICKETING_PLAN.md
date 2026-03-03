# Maintenance Ticketing System – Implementation Plan

## Deployment: same app, same link, same Vercel, same Supabase

- **Same app:** One codebase. One Vercel project. One Supabase project.
- **Same domain:** e.g. `https://tickets.people-usa.org`. No separate “maintenance” domain or Vercel deployment.
- **Different paths:** IT at `/ticketing-system`, Maintenance at `/maintenance-system`. Users open the same site and choose the system (or bookmark each path).
- **Different data:** New tables in the **same** Supabase DB: `maintenance_tickets`, `maintenance_comments`, etc. IT tables stay separate. No second Supabase project.

So: **one link** (one URL), **one app** (one Vercel + one Supabase). Only the path and which tables we use change. IT and Maintenance do not see each other’s tickets because they use different tables and different routes/APIs.

---

## What we will implement (steps only)

### 1. Database (Supabase – same project)

- Create table **`maintenance_tickets`** (same columns as `tickets`: id, title, description, category, department_program, supervisor, requester_email, status, assigned_to, attachments, created_at, updated_at). Categories: maintenance list (Vehicle, HVAC, Plumbing, etc.).
- Create table **`maintenance_comments`** (id, ticket_id → maintenance_tickets, author_email, body, attachments, created_at).
- Create table **`maintenance_ticket_reads`** (for unread dots), same idea as IT read-tracking.
- Storage: reuse existing attachments bucket with prefix **`maintenance/`** for maintenance ticket/comment files.
- Add RLS on maintenance tables: staff (from MAINTENANCE_STAFF_EMAILS) see all; requesters see only their own tickets.

### 2. Config (`src/lib/constants.ts`)

- Add **`MAINTENANCE_STAFF_EMAILS`** (maintenance staff who see all maintenance tickets).
- Add **`getMaintenanceTicketViewUrl(ticketId)`** → `${APP_BASE_URL}/maintenance-system/tickets/${ticketId}`.
- Keep **`IT_EMAILS`** and **`getTicketViewUrl`** unchanged. Reuse **`APP_BASE_URL`** for maintenance emails.

### 3. API routes (`src/app/api/maintenance/`)

- **`tickets/route.ts`** – POST create ticket (maintenance categories), upload to `maintenance/` prefix, send emails with `getMaintenanceTicketViewUrl`.
- **`tickets/[id]/route.ts`** – GET one ticket, PATCH update.
- **`tickets/[id]/attachments/route.ts`** – POST add, DELETE remove attachments.
- **`tickets/[id]/read/route.ts`** – POST mark as read.
- **`tickets/status/route.ts`** – PATCH status + email notifications with maintenance ticket link.
- **`tickets/unread/route.ts`** – GET unread ticket IDs for current user (red dots).
- **`comments/route.ts`** – POST new comment, optional attachments, “new reply” emails with maintenance ticket link.
- **`comments/[id]/attachments/route.ts`** – if IT has this, mirror for maintenance.

### 4. Front-end routes

- **`/maintenance-system/page.tsx`** – Main page: header “Maintenance Ticketing System”, same Microsoft auth, tabs “Create Ticket” and “Tickets”, logout. If not logged in and `?auth=redirect`, start OAuth and redirect back to `/maintenance-system`. Use MAINTENANCE_STAFF_EMAILS and maintenance APIs only.
- **`/maintenance-system` (logged in)** – List from maintenance API (staff see all, others see own). Create form with maintenance categories only; submit to `/api/maintenance/tickets`; photo uploads on create.
- **`/maintenance-system/tickets/[id]/page.tsx`** – Ticket detail: view, comments, add comment with attachments, status (staff), “Sign in” banner when opened from email unauthenticated, mark-as-read and unread via maintenance APIs. All email links to this page use `getMaintenanceTicketViewUrl`.

### 5. Emails

- All maintenance emails (new ticket, status update, new reply) use **`getMaintenanceTicketViewUrl(ticketId)`** in “View your ticket” link. Reuse existing email sending; only link and wording (e.g. “Maintenance ticket”) differ.

### 6. Home / entry

- Update home so users can choose system: e.g. two links/cards – “IT Ticketing System” → `/ticketing-system`, “Maintenance Ticketing System” → `/maintenance-system` (or keep current redirect and add a visible “Maintenance” link to `/maintenance-system`).

### 7. No new env or deployment

- Same Vercel project, same Supabase project, same `NEXT_PUBLIC_APP_URL` / `APP_BASE_URL`. No new env vars for maintenance.

---

## Maintenance categories (to implement)

- Vehicle  
- HVAC  
- Plumbing  
- Electrical  
- General Repairs  
- Safety / Inspections  
- Other  

(Adjust with maintenance team if needed.)

---

## Testing before release

- [ ] Create maintenance ticket (with photo); requester and maintenance staff get emails with link to `/maintenance-system/tickets/[id]`.
- [ ] Open that link unauthenticated: read-only ticket, “Sign in” works; after sign-in, list shows and red dot on that ticket works.
- [ ] Status change and new comment send emails with same maintenance link.
- [ ] Maintenance staff see only maintenance tickets; IT staff see only IT tickets.
- [ ] Attachments work on create and in comments.
- [ ] Email link uses production URL and does not redirect to Vercel login.
