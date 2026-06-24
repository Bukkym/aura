-- Rename plans.host_user_id to created_for_user_id.
--
-- Aura is pool-based: every plan participant is a requester and also an
-- attendee; nobody is a "host". This column never meant "host" in the product
-- sense, it marks which user a plan was generated for (the others matched in are
-- equally requesters who can join it). Rename it so the schema matches the
-- model. Pure rename: Postgres rewrites the dependent RLS policies to the new
-- column automatically, so no policy changes are needed. No behavior change.

alter table public.plans
  rename column host_user_id to created_for_user_id;

alter index if exists plans_host_user_id_idx
  rename to plans_created_for_user_id_idx;
