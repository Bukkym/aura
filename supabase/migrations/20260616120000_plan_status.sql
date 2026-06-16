-- Module 4 (M4.1): plan confirmation status.
--
-- Plans are now persisted to public.plans (the table existed since the Slice B'
-- schema but was never written to). A plan starts "ready" and becomes
-- "confirmed" when the host accepts it ("I'm in"). Status is derived from this
-- column: confirmed when confirmed_at is not null, else ready.
--
-- Nullable add only, so it is backward compatible: inserts that omit it succeed
-- and existing rows read as not-yet-confirmed. The existing "plans can be
-- updated by their host" RLS policy already covers setting this column.

alter table public.plans add column confirmed_at timestamptz;
