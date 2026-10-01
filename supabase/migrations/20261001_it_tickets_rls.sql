-- Close public access to IT ticket tables without deleting or editing any rows.
-- Logged-in employees still read their own tickets. IT staff still read all of them.
-- The API uses the service role and is not affected.
--
-- Rollback (restores the previous open access, still deletes nothing):
--   drop policy if exists tickets_select on public.tickets;
--   drop policy if exists comments_select on public.comments;
--   alter table public.tickets disable row level security;
--   alter table public.comments disable row level security;
--   alter table public.ticket_reads disable row level security;

-- Keep this list synchronized with src/lib/constants.ts IT_EMAILS.
create or replace function public.is_it_staff(user_email text)
returns boolean
language sql
stable
as $$
  select lower(coalesce(user_email, '')) in (
    'cmansilla@people-usa.org',
    'mshevkun@people-usa.org'
  );
$$;

alter table public.tickets enable row level security;
alter table public.comments enable row level security;
alter table public.ticket_reads enable row level security;

drop policy if exists tickets_select on public.tickets;
create policy tickets_select
on public.tickets
for select
to authenticated
using (
  lower(requester_email) = lower(coalesce(auth.jwt()->>'email', ''))
  or public.is_it_staff(auth.jwt()->>'email')
);

drop policy if exists comments_select on public.comments;
create policy comments_select
on public.comments
for select
to authenticated
using (
  exists (
    select 1
    from public.tickets t
    where t.id = comments.ticket_id
      and (
        lower(t.requester_email) = lower(coalesce(auth.jwt()->>'email', ''))
        or public.is_it_staff(auth.jwt()->>'email')
      )
  )
);

notify pgrst, 'reload schema';
