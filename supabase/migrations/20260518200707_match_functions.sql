-- Slice B′ matching layer: SQL functions that power lib/findSimilar.ts.
--
-- We expose two RPCs:
--   match_users  — mutual-fit cosine over public.users, returning ranked ids + scores
--   match_places — one-sided cosine over public.places
--
-- Both run SECURITY INVOKER (the default) so the existing RLS policies still
-- apply: `users` and `places` are publicly readable, which is exactly what
-- matching needs. No filtering on auth_user_id — seeded mock users (auth_user_id
-- IS NULL) are part of the matching pool until real users sign up.
--
-- Scale note: at 175 seeded users a single-pass full mutual-fit sort over the
-- entire table runs comfortably under 100ms via sequential scan. HNSW indexes
-- can only accelerate a single `ORDER BY column <=> query` expression, so the
-- sum-of-two-cosine-terms below cannot be index-accelerated as written.
-- When the pool grows past ~5k rows, switch to candidate-then-rerank:
--   1) pull the top ~200 candidates by ORDER BY u.self_embedding <=> query_looking_for
--      (HNSW-accelerated, one-sided)
--   2) re-score that candidate set with the full mutual-fit term and LIMIT k.

-- ----------------------------------------------------------------------------
-- match_users
-- ----------------------------------------------------------------------------
--
-- Mutual-fit score:
--   score(query, u) = 0.5 * cos(query.looking_for, u.self)
--                   + 0.5 * cos(u.looking_for, query.self)
--
-- pgvector's `<=>` operator returns cosine *distance* (0 = identical, 2 = opposite),
-- so cosine *similarity* = 1 - (a <=> b). Score is in [0, 1].

create or replace function public.match_users(
  query_self          vector(1536),
  query_looking_for   vector(1536),
  exclude_user_id     uuid,
  k                   int default 10
)
returns table (user_id uuid, score float)
language sql
stable
as $$
  select
    u.id as user_id,
    (0.5 * (1 - (query_looking_for <=> u.self_embedding))
     + 0.5 * (1 - (u.looking_for_embedding <=> query_self)))::float as score
  from public.users u
  where u.id <> exclude_user_id
  order by score desc
  limit k;
$$;

-- ----------------------------------------------------------------------------
-- match_places
-- ----------------------------------------------------------------------------
--
-- One-sided cosine. The query embedding represents the vibe of the activity
-- being planned (or a user's combined preferences); we want the closest places.
-- HNSW-accelerated because there is exactly one operator in the ORDER BY.

create or replace function public.match_places(
  query_embedding  vector(1536),
  k                int default 10
)
returns table (place_id uuid, score float)
language sql
stable
as $$
  select
    p.id as place_id,
    (1 - (p.embedding <=> query_embedding))::float as score
  from public.places p
  order by p.embedding <=> query_embedding
  limit k;
$$;
