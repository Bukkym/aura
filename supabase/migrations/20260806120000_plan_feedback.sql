-- Post-plan feedback: directional "would I meet them again?" per attendee.
--
-- This is the data engine behind recurrence (re-seating the people you clicked
-- with) and the stated-vs-revealed signal the intelligence thesis rests on
-- (see technical/10-predictive-lift-experiment.md and product/02). One row per
-- (plan, rater, ratee); the rater is always the authenticated user, so a row is
-- a directional judgement (A would meet B again), not a symmetric edge.

create table public.plan_feedback (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid not null references public.plans(id) on delete cascade,
  rater_id          uuid not null references public.users(id) on delete cascade,
  ratee_id          uuid not null references public.users(id) on delete cascade,
  would_meet_again  boolean not null,
  created_at        timestamptz not null default now(),
  unique (plan_id, rater_id, ratee_id)
);

alter table public.plan_feedback enable row level security;

-- A user reads and writes only their own feedback (they are the rater). The
-- upsert path (insert-or-update on the unique key) needs both insert and update.
create policy "plan_feedback readable by the rater"
  on public.plan_feedback for select
  using (auth.uid() = (select auth_user_id from public.users where id = rater_id));

create policy "plan_feedback insertable by the rater"
  on public.plan_feedback for insert
  with check (auth.uid() = (select auth_user_id from public.users where id = rater_id));

create policy "plan_feedback updatable by the rater"
  on public.plan_feedback for update
  using (auth.uid() = (select auth_user_id from public.users where id = rater_id))
  with check (auth.uid() = (select auth_user_id from public.users where id = rater_id));

create index plan_feedback_plan_idx  on public.plan_feedback (plan_id);
create index plan_feedback_ratee_idx on public.plan_feedback (ratee_id, would_meet_again);
