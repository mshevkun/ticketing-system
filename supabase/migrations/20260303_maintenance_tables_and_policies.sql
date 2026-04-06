-- Maintenance portal tables and strict RLS isolation.
-- Apply in the shared Supabase project used by both IT and Maintenance sites.

create table if not exists public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null,
  status text not null default 'new',
  requester_email text not null,
  department_program text not null,
  supervisor text not null,
  attachments text[] default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maintenance_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  author_email text not null,
  content text not null,
  attachments text[] default '{}'::text[],
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_ticket_reads (
  user_email text not null,
  ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_email, ticket_id)
);

create index if not exists idx_maintenance_tickets_requester_email
  on public.maintenance_tickets (requester_email);
create index if not exists idx_maintenance_comments_ticket_id
  on public.maintenance_comments (ticket_id);

alter table public.maintenance_tickets enable row level security;
alter table public.maintenance_comments enable row level security;
alter table public.maintenance_ticket_reads enable row level security;

-- Keep this list synchronized with maintenance-app/src/lib/constants.ts.
create or replace function public.is_maintenance_staff(user_email text)
returns boolean
language sql
stable
as $$
  select lower(coalesce(user_email, '')) in (
    'syoung@people-usa.org',
    'mshevkun@people-usa.org'
  );
$$;

-- maintenance_tickets policies
drop policy if exists maintenance_tickets_select on public.maintenance_tickets;
create policy maintenance_tickets_select
on public.maintenance_tickets
for select
using (
  lower(requester_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.is_maintenance_staff(auth.jwt()->>'email')
);

drop policy if exists maintenance_tickets_insert on public.maintenance_tickets;
create policy maintenance_tickets_insert
on public.maintenance_tickets
for insert
with check (
  lower(requester_email) = lower(coalesce(auth.jwt()->>'email', ''))
);

drop policy if exists maintenance_tickets_update on public.maintenance_tickets;
create policy maintenance_tickets_update
on public.maintenance_tickets
for update
using (
  lower(requester_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.is_maintenance_staff(auth.jwt()->>'email')
)
with check (
  lower(requester_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.is_maintenance_staff(auth.jwt()->>'email')
);

drop policy if exists maintenance_tickets_delete on public.maintenance_tickets;
create policy maintenance_tickets_delete
on public.maintenance_tickets
for delete
using (
  lower(requester_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.is_maintenance_staff(auth.jwt()->>'email')
);

-- maintenance_comments policies
drop policy if exists maintenance_comments_select on public.maintenance_comments;
create policy maintenance_comments_select
on public.maintenance_comments
for select
using (
  exists (
    select 1
    from public.maintenance_tickets t
    where t.id = maintenance_comments.ticket_id
      and (
        lower(t.requester_email) = lower(coalesce(auth.jwt()->>'email', ''))
        or public.is_maintenance_staff(auth.jwt()->>'email')
      )
  )
);

drop policy if exists maintenance_comments_insert on public.maintenance_comments;
create policy maintenance_comments_insert
on public.maintenance_comments
for insert
with check (
  lower(author_email) = lower(coalesce(auth.jwt()->>'email', ''))
  and exists (
    select 1
    from public.maintenance_tickets t
    where t.id = maintenance_comments.ticket_id
      and (
        lower(t.requester_email) = lower(coalesce(auth.jwt()->>'email', ''))
        or public.is_maintenance_staff(auth.jwt()->>'email')
      )
  )
);

drop policy if exists maintenance_comments_update on public.maintenance_comments;
create policy maintenance_comments_update
on public.maintenance_comments
for update
using (
  lower(author_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.is_maintenance_staff(auth.jwt()->>'email')
)
with check (
  lower(author_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.is_maintenance_staff(auth.jwt()->>'email')
);

drop policy if exists maintenance_comments_delete on public.maintenance_comments;
create policy maintenance_comments_delete
on public.maintenance_comments
for delete
using (
  lower(author_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.is_maintenance_staff(auth.jwt()->>'email')
);

-- maintenance_ticket_reads policies
drop policy if exists maintenance_ticket_reads_select on public.maintenance_ticket_reads;
create policy maintenance_ticket_reads_select
on public.maintenance_ticket_reads
for select
using (
  lower(user_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.is_maintenance_staff(auth.jwt()->>'email')
);

drop policy if exists maintenance_ticket_reads_upsert on public.maintenance_ticket_reads;
create policy maintenance_ticket_reads_upsert
on public.maintenance_ticket_reads
for all
using (
  lower(user_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.is_maintenance_staff(auth.jwt()->>'email')
)
with check (
  lower(user_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.is_maintenance_staff(auth.jwt()->>'email')
);
