# Infrastructure

The Slice B′ infrastructure: Supabase as the database + auth provider, Vercel as the host, magic-link as the only auth method. This doc is the operator runbook for both day-to-day work and the eventual production deploy.

Date written: 2026-05-18.

---

## Supabase

### Project

- Name: `aura`
- Region: EU (Frankfurt) — keeps user data inside the EU; closer to Berlin users.
- URL: `https://rrxlkoswcwyqrhswyvgj.supabase.co`

### Schema

Three tables, defined in `supabase/migrations/20260513105207_init_schema.sql`:

| Table | Purpose | Embedding columns |
|---|---|---|
| `public.users` | Seeded mock users (175) and real authed users in the same pool. `auth_user_id` is nullable. | `self_embedding vector(1536)`, `looking_for_embedding vector(1536)` |
| `public.places` | 33 Berlin venues, seeded once. | `embedding vector(1536)` |
| `public.plans` | Generated Plans (activity + venue + attendees + why-this-plan). | none |

Each embedding column has an HNSW cosine index (`using hnsw (col vector_cosine_ops)`). At 175 rows HNSW is overkill for `users` and falls back to sequential scan, but the index is cheap and pays off the moment the table grows.

### RLS posture

- `users` — public read (the matching pool needs to see every candidate); writes gated to `auth.uid() = auth_user_id`.
- `places` — public read, no app-side writes (admin client seeds them).
- `plans` — read if you're host or attendee; write only as host.

Public-read on `users` is acceptable at this size — 175 mock rows + a handful of demo accounts, no sensitive PII. The real product narrows this to cluster-level visibility.

### Matching RPCs

Defined in `supabase/migrations/20260518200707_match_functions.sql`. Both run `SECURITY INVOKER` so the existing RLS applies.

- `match_users(query_self, query_looking_for, exclude_user_id, k)` — mutual-fit cosine, single-pass over all 175 rows. Returns ranked `(user_id, score)`. At ~5k+ rows we switch to candidate-then-rerank (HNSW pull of top ~200 by one-sided cosine, then rescore with the full mutual-fit term). The migration carries a comment noting the threshold.
- `match_places(query_embedding, k)` — one-sided cosine, HNSW-accelerated.

`lib/findSimilar.ts` is the single TS seam over these RPCs (`findSimilarUsers`, `findSimilarPlaces`). Nothing outside that module knows we're on pgvector.

### Auth provider config

In the Supabase Dashboard:

- **Authentication → Providers → Email** — enabled, "Enable email confirmations" left on.
- **Authentication → URL Configuration → Redirect URLs** — must list:
  - `http://localhost:3000/auth/callback` (dev)
  - `https://<vercel-domain>/auth/callback` (preview + prod, once known)

Without these entries in the allow-list, Supabase will reject the `emailRedirectTo` value in `signInWithOtp` and the magic-link flow fails silently with a vague redirect-mismatch error.

### Three Supabase client factories

All three live under `lib/supabase/`. Pick the right one for the context.

| File | When | Identity |
|---|---|---|
| `lib/supabase/browser.ts` | Client Components. | Anon (publishable key). RLS governs. |
| `lib/supabase/server.ts` | Server Components, Route Handlers, Server Actions. | Anon by default; reads + writes the auth cookie, so calls execute as the signed-in user. |
| `lib/supabase/admin.ts` | Admin scripts (seed migration, smoke tests, future backfills). | Service role (secret key). Bypasses RLS entirely. **Never** import from any code that runs in the browser. |

The middleware (`middleware.ts` + `lib/supabase/middleware.ts`) re-runs on every request to refresh the session cookie via `supabase.auth.getUser()`. Without this, Server Components drift to a stale token and start hitting 401s.

---

## Auth flow

```
Welcome (/) ──► Voice (/voice) ──► Chips (/chips) ──┐
                                                    │  ◄── all three remain anonymous
                                                    ▼
                                          "Find my people" button
                                                    │
                                                    ▼
                          Already authed? ──yes──► Plan card (/plan)
                                                    │
                                                    │ no
                                                    ▼
                                       /auth/login?next=/plan
                                                    │
                              [user types email, submits form]
                                                    │
                                                    ▼   ── sendMagicLink Server Action
                              supabase.auth.signInWithOtp({
                                email,
                                emailRedirectTo: origin + /auth/callback?next=/plan
                              })
                                                    │
                                                    ▼
                                       /auth/check-email
                                                    │
                              [user opens magic link in email]
                                                    │
                                                    ▼
                              /auth/callback?token_hash=…&type=email&next=/plan
                                                    │   ── route handler
                              supabase.auth.verifyOtp({ token_hash, type })
                                                    │
                                                    ▼
                                            Redirect → /plan
```

### Just-in-time placement

The auth gate sits at "Find my people," not at the front door. Welcome / Voice / Chips run anonymously: the user can talk about themselves, see their extracted preferences, and edit chips before ever being asked to sign in. This keeps the AI-first feel of discovery intact.

When they click "Find my people":

1. If already signed in → straight to Plan card.
2. If not → bounce to `/auth/login?next=/plan`, which after callback brings them back to `/plan`.
3. At Plan creation, a `public.users` row is created with their `auth_user_id` and their accumulated preferences + embeddings. This is the moment the user joins the matching pool.

Slice B′ landed steps 1 and 2 (the routes themselves). Step 3 is wired up in Slice B alongside the Plan card screen.

### Mock users + auth users in one table

`public.users.auth_user_id` is nullable. Seeded mock users carry `NULL` and are matchable but not logged-in-able. Authed users carry their `auth.users(id)`. The matching RPC has no filter on this column — the pool is the union.

---

## Vercel (deploy target, not yet provisioned)

Slice E deploys to Vercel. Env vars to set on the project (same names as `.env.local.example`):

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL` (pooled, port 6543, for app runtime)
- `DIRECT_URL` (direct, port 5432, for any future Vercel-side migration runs)

After the first deploy, copy the production URL into Supabase → Authentication → URL Configuration → Redirect URLs. Preview deploys get their own URLs per branch; add a wildcard like `https://*.vercel.app/auth/callback` if you want previews to work, or just the named prod domain if you don't.

---

## Local development

```bash
# One-time
cp .env.local.example .env.local       # fill in keys
npm install

# Apply schema + matching RPCs
psql "$DIRECT_URL" -f supabase/migrations/20260513105207_init_schema.sql
psql "$DIRECT_URL" -f supabase/migrations/20260518200707_match_functions.sql

# Seed mock data
npm run seed                            # 175 users + 33 places written to JSON
npm run migrate:json-to-db              # JSON → Supabase

# Smoke test the matching layer
npm run smoke:match                     # exercises both RPCs end-to-end

# Dev server
npm run dev
```

DB writes always go through `psql "$DIRECT_URL"`, never `DATABASE_URL` — the latter is the pgbouncer-pooled URL and `psql` can't parse it. Application code (`@supabase/supabase-js`) uses the JS API, not the connection string, so this only matters for migrations and ad-hoc psql sessions.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Magic link email never arrives | Check spam, then check Supabase Dashboard → Logs → Auth. Free tier has rate limits (3/hour per email at one point). |
| Click magic link → redirected to `/auth/login?error=...` with a redirect-mismatch error | Callback URL not in the allowed Redirect URLs list. Add it in Authentication → URL Configuration. |
| `match_users` RPC returns empty | Most likely zero rows in `users` table — run `npm run migrate:json-to-db` to seed. |
| Server Component reads return 401 despite a valid cookie | Middleware isn't running. Confirm `middleware.ts` exists at the repo root and its `matcher` covers the path. |
| `psql: could not translate host name` against `DATABASE_URL` | You're using the pooled URL with `psql`. Use `$DIRECT_URL` instead. |
