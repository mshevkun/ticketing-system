-- Replace Carlos with Samuel for maintenance RLS. Run in Supabase SQL Editor if DB already exists.
-- Synced with maintenance-app/src/lib/constants.ts MAINTENANCE_EMAILS.

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
