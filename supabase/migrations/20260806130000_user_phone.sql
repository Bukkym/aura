-- Just-in-time phone collection: captured on the confirmed screen so Ora can
-- text the appointment details (email already comes from auth). Nullable and
-- private (never exposed to other members). No new RLS needed: the existing
-- "users update their own row" policy covers writing it.
alter table public.users add column phone text;
