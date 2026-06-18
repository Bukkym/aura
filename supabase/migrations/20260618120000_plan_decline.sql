-- Module 4 (M4.2): decline + refinement on plans.
--
-- declined_at: set when the host dismisses a plan ("Not now"). Status derives
-- declined when declined_at is not null (checked before confirmed/ready).
-- Declined plans are filtered out of listPlanSummaries, so they drop off Home
-- and the Plans tab while staying on the row for history/analytics.
--
-- refinement: records what a "request another Plan" asked for
-- ({ activityType?, excludeUserIds? }), so a refined regeneration is
-- distinguishable from the first plan and repeat requests stay idempotent.
--
-- Both are nullable adds, so they are backward compatible: existing inserts
-- that omit them still succeed and existing rows read as not-declined with no
-- refinement. The existing "plans can be updated by their host" RLS policy
-- already covers setting declined_at, same as confirmed_at.

alter table public.plans add column declined_at timestamptz;
alter table public.plans add column refinement jsonb;
