# MVP Technical Decisions

Locked decisions for the bootcamp MVP. Resolves the Open Questions in PROJECT.md.

Date locked: 2026-05-07. Revised 2026-05-18 to absorb Slice B′ (Supabase persistence + magic-link auth).

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Vector store | Supabase Postgres + pgvector (HNSW cosine indexes on every embedding column). | Bootcamp deliverable requires a deployed app with a real database, not in-memory state. pgvector is bundled with Supabase, so this is one provisioning choice that solves both persistence and vector search. Single SQL function does the full mutual-fit score in one round trip. See `/technical/04-infrastructure.md` and `supabase/migrations/`. (Superseded local in-memory cosine on 2026-05-11.) |
| 2 | Frontend framework | Next.js (App Router) | Single deploy, API routes built-in, no CORS plumbing. |
| 3 | Backend language | Node + TypeScript (Next.js API routes + Server Actions for auth UI only) | Pairs with #2. Same language across web today, API, and React Native mobile later. Heavy ML work, if ever needed, becomes a small Python sidecar. |
| 4 | Mock dataset | 175 LLM-generated users across 7 archetypes (25 each), seeded to Supabase with `auth_user_id = NULL`. | Enough variety to surface non-obvious matches without making debug painful. Mock rows are matchable but not logged-in-able. Real authed users coexist in the same table from day one. |
| 5 | Refinement loop | Re-extract + re-rank (not just filter) | "More social" updates the visible chips, then re-ranks via the same `match_users` RPC. This is the demo moment that proves the AI-first thesis. |
| 6 | Voice input | Voice for open-ended preference questions, typed for structured fields. OpenAI Whisper API for transcription. | User typing long qualitative answers is bad UX. Whisper has strong multilingual quality, and the same pattern (record → POST → transcribe → extract) ports directly to mobile via `expo-av`. |
| 7 | City | Berlin, English-only | Rich venue/event data (Google Places, Resident Advisor, Eventbrite, Meetup). Target users (expats, new-to-city) navigate Berlin in English. German support is a Phase 2 concern. |
| 8 | Auth | Magic-link via Supabase Auth, email-only. Just-in-time placement at "Find my people"; Welcome / Voice / Chips remain anonymous. Phone (Twilio) is out of scope for the bootcamp MVP. | The deliverable is a deployed product with real accounts, but the user shouldn't have to sign up before they see value. JIT placement preserves the AI-first feel of the discovery flow while giving the system real `auth_user_id` rows once a Plan is generated. Magic-link is one provider, one toggle in the Supabase Dashboard, no password UX. (Superseded "skip for MVP" on 2026-05-11.) |

## Architectural rules to protect future portability

These are not decisions, they are guardrails that make sure the locked stack does not paint us into a corner later.

1. **All extraction/matching/ranking logic lives in `/lib`, not in route handlers.** Route handlers are thin wrappers that parse the request, call the lib, and return JSON. This is what allows the same backend to serve the React Native mobile app later, and what allows the API to be lifted out of Next.js into a standalone service if we ever want that.
2. **Mobile-reusable data flow is plain HTTP+JSON.** No Server Actions and no RSC-tightly-coupled data fetching for any flow mobile will reuse (extraction, matching, Plan generation, refinement). Server Components are fine for purely presentational/server-rendered UI. The narrow exception is auth UI plumbing (`/auth/login` submits via a Server Action) because Supabase has first-class native SDKs (React Native, iOS, Android) so mobile will not reuse the web auth pages anyway.
3. **Vector storage is hidden behind `lib/findSimilar.ts`.** No code outside that module knows the vector store is pgvector. The two RPCs (`match_users`, `match_places`) are the storage abstraction; if we ever move to a managed vector DB, only this module + the migrations change.
4. **Every `public.users` row has an `auth_user_id` (nullable).** Seeded mock users carry `NULL` and are matchable, not logged-in-able. The seam is uniform: matching, Plan generation, and explanation code never branches on "is this user real or mock." Row Level Security enforces the line between "the user can read this" and "the user can write this."
