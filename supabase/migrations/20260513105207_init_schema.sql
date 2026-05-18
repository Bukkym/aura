-- Slice B′ schema: users, places, plans. Embeddings live as vector(1536)
-- columns; HNSW cosine indexes power the matching layer behind findSimilar().
--
-- RLS posture (MVP):
--   users   : read public (matching needs to see every candidate), write only your own row
--   places  : read public, no app-side writes (seeded via service-role admin client)
--   plans   : read if host or attendee, write only as host
--
-- Public-read on users is acceptable for the bootcamp MVP: 175 seeded mock
-- users + a handful of demo accounts, no sensitive PII. The real product
-- narrows this to cluster-level visibility.

create extension if not exists vector;

-- ----------------------------------------------------------------------------
-- users
-- ----------------------------------------------------------------------------

create table public.users (
  id                     uuid primary key default gen_random_uuid(),
  auth_user_id           uuid unique references auth.users(id) on delete cascade,
  display_name           text not null,
  city                   text not null default 'Berlin',
  age_range_min          int,
  age_range_max          int,
  raw_inputs             jsonb not null default '{}'::jsonb,
  self_extracted         jsonb not null default '{}'::jsonb,
  looking_for_extracted  jsonb not null default '{}'::jsonb,
  self_embedding         vector(1536) not null,
  looking_for_embedding  vector(1536) not null,
  archetype              text,
  created_at             timestamptz not null default now()
);

create index users_auth_user_id_idx on public.users (auth_user_id);

create index users_self_embedding_hnsw
  on public.users using hnsw (self_embedding vector_cosine_ops);

create index users_looking_for_embedding_hnsw
  on public.users using hnsw (looking_for_embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- places
-- ----------------------------------------------------------------------------

create table public.places (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  type                text not null check (
                        type in ('cafe','bar','club','gallery','park','gym','venue','other')
                      ),
  neighborhood        text not null,
  activity_type_tags  text[] not null default '{}',
  vibe_tags           text[] not null default '{}',
  description         text not null,
  embedding           vector(1536) not null,
  created_at          timestamptz not null default now()
);

create index places_embedding_hnsw
  on public.places using hnsw (embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- plans
-- ----------------------------------------------------------------------------

create table public.plans (
  id                  uuid primary key default gen_random_uuid(),
  host_user_id        uuid not null references public.users(id) on delete cascade,
  activity_type       text not null,
  place_id            uuid not null references public.places(id),
  date_time           timestamptz not null,
  vibe                text[] not null default '{}',
  attendee_user_ids   uuid[] not null default '{}',
  why_this_plan       text not null,
  created_at          timestamptz not null default now()
);

create index plans_host_user_id_idx on public.plans (host_user_id);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.users  enable row level security;
alter table public.places enable row level security;
alter table public.plans  enable row level security;

-- users: everyone can read (matching pool); writes gated on auth.uid()

create policy "users are publicly readable"
  on public.users for select
  using (true);

create policy "users can insert their own row"
  on public.users for insert
  with check (auth.uid() is not null and auth.uid() = auth_user_id);

create policy "users can update their own row"
  on public.users for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

create policy "users can delete their own row"
  on public.users for delete
  using (auth.uid() = auth_user_id);

-- places: read-only to the app; the admin client (service role) bypasses RLS
--         entirely for seed + future curation, so no insert/update/delete
--         policies are needed here.

create policy "places are publicly readable"
  on public.places for select
  using (true);

-- plans: visible to the host and to attendees; only the host can write.

create policy "plans are readable by host or attendees"
  on public.plans for select
  using (
    auth.uid() is not null
    and (
      auth.uid() = (select auth_user_id from public.users where id = host_user_id)
      or auth.uid() in (
        select auth_user_id from public.users where id = any(attendee_user_ids)
      )
    )
  );

create policy "plans can be inserted by their host"
  on public.plans for insert
  with check (
    auth.uid() is not null
    and auth.uid() = (select auth_user_id from public.users where id = host_user_id)
  );

create policy "plans can be updated by their host"
  on public.plans for update
  using (
    auth.uid() = (select auth_user_id from public.users where id = host_user_id)
  )
  with check (
    auth.uid() = (select auth_user_id from public.users where id = host_user_id)
  );

create policy "plans can be deleted by their host"
  on public.plans for delete
  using (
    auth.uid() = (select auth_user_id from public.users where id = host_user_id)
  );
