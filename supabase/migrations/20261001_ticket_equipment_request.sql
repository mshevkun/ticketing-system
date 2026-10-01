-- Equipment request answers on IT tickets.
-- Apply in the Supabase project used by the IT ticketing app.

alter table public.tickets
  add column if not exists equipment_requested boolean not null default false,
  add column if not exists equipment_owner_name text,
  add column if not exists equipment_item text,
  add column if not exists equipment_program text,
  add column if not exists equipment_budget text;

notify pgrst, 'reload schema';
