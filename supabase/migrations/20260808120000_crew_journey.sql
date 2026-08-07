-- Dual-track home: a user opts into "forming a crew" (the 5-plan journey) vs
-- one-off single plans. This flag flips Home from single mode to the crew
-- journey tracker (activity N of 5). Set when they choose the journey at
-- checkout or "Start a crew" on Home. Progress (N) is derived from their
-- confirmed plans, not stored here.
alter table public.users add column on_crew_journey boolean not null default false;
