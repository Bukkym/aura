-- Module 3: chip-onboarded users have no LLM embedding at sign-up (matching
-- is deterministic structured overlap, no runtime OpenAI). The embedding
-- columns become nullable so /api/plan/create can insert a user row without
-- generating vectors. Seed users keep their precomputed embeddings; Module 4
-- will lazily backfill real embeddings for chip-onboarded users.

alter table public.users
  alter column self_embedding drop not null,
  alter column looking_for_embedding drop not null;
