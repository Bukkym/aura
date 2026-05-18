# Aura — by Ora

## Brand
- **Product:** Aura (the consumer app)
- **Company:** Ora (the intelligence platform)
- **AI entity:** Ora (the intelligence inside Aura -- "Ask Ora", "Ora found your people")

See `/branding/02-naming.md` for full naming rationale and `/branding/01-brand-strategy.md` for brand architecture.

---

## Overview

An AI-powered system that helps users find relevant people and social experiences by translating natural-language input into structured preferences and generating explainable matches and recommendations.

---

## Problem

People struggle to find meaningful social connections because:
- They don't know how to clearly express what they're looking for.
- Existing platforms rely on rigid filters or shallow signals.
- Matches often feel random or low quality.

## Solution

Let users describe what they want in their own words, then:
1. Extract structured preferences using an LLM.
2. Match them with relevant people.
3. Recommend places and events.
4. Explain *why* those matches make sense.

## Target Users

- People new to a city
- Young professionals / expats
- People looking to expand their social circle
- Users dissatisfied with generic meetup / dating apps

## Core Value Proposition

- Better quality matches
- Less effort in expressing preferences
- More confidence through explainability

---

## Phase 1 — Bootcamp MVP

**Goal:** prove the core insight and build a strong portfolio project.

### Core Hypothesis

AI can significantly improve matching quality by:
- Understanding unstructured user input
- Converting it into structured attributes
- Using that to generate better recommendations

### Must-Have Features

1. **User input (AI-first onboarding)**
   - Text input; voice optional if time permits.
   - Example prompt: *"Describe the kind of people or vibe you're looking for."*

2. **Preference extraction (LLM)**
   - Convert free text into structured attributes.
   - Example input: *"Chill but ambitious people into startups"*
   - Example output:
     - Personality: Chill, Ambitious
     - Interests: Startups
     - Social preference: Low-pressure
   - Attributes shown as **editable chips/blocks** in the UI.

3. **Profile structuring**
   - Store extracted attributes.
   - Basic normalization.

4. **Matching system**
   - Embeddings / similarity search over a mock user dataset.

5. **Place / event recommendation (RAG-lite)**
   - Recommend cafes, events.
   - Based on shared interests and location.

6. **Explanation layer (critical — the differentiator)**
   - Each result shows *why this match*.
   - Example: *"Both interested in startups"*, *"Similar social preferences"*.

7. **Iteration loop**
   - User refines with phrases like *"more social"* or *"less intense"*.
   - System re-extracts attributes and re-ranks.

8. **External coordination (lean)**
   - "Create WhatsApp group" (mock or link).
   - "Copy invite message".
   - Shows product thinking without building chat.

### UI / UX Principles

- Minimal, clean interface.
- AI-first interaction — **not** a chat log.
- Key elements: input area, visible preference blocks, results list, explanation tags.

### Tech Stack (proposed)

- **Frontend:** React / Next.js
- **Backend:** Node or Python API
- **LLM:** OpenAI (or equivalent)
- **Orchestration:** LangChain
- **Vector DB:** Pinecone / Weaviate / local (see open questions)

### Evaluation Metrics

- Relevance of matches
- Correctness of extracted attributes
- User satisfaction (manual scoring)

### Deliverables

- Working web app
- 1–2 core flows fully functional
- GitHub repo
- Short write-up: problem, approach, tradeoffs, learnings

### Out of Scope (Phase 1)

These are out of scope for the bootcamp MVP only. Group chat, presence cards, and full communication infrastructure are core to the real product and ship in Phase 3.

- Group chat (ships in Phase 3 / Group Life)
- Presence cards (ships in Phase 3)
- Full Plan coordination by the group
- Feedback loops affecting ranking
- Social graph

---

## Full Product Vision (Beyond Bootcamp)

### Core Philosophy

The product is invisible infrastructure. AI handles compatibility, curation, and logistics. The user experiences: show up, enjoy, repeat. Friendships form as a natural byproduct of doing things they love with people who fit. No "make friends" framing. No host. No forced bonding. Just curated activities with compatible people, repeated over time.

**On profiles and chat -- the precise principle:**
The "no profiles, no chat" rule applies specifically to the *discovery mechanic*, not the full product lifecycle. In discovery, you don't browse profiles to decide who you want to meet and you don't chat with strangers before showing up. The AI handles compatibility invisibly and you experience people through shared activity rather than profile judgment. That principle holds permanently.

What changes by Phase 3: once a group has formed through lived experience, all normal social infrastructure follows. Group chat is not just acceptable -- it is the product in Group Life. A lightweight presence card (visible after meeting someone at a Plan, not before) helps people remember who they met. The distinction that matters is between a *browsing profile* (you judge someone before meeting them, like a dating app) and a *presence card* (you see it after, to connect what you experienced with who the person is). The first model is rejected. The second is necessary.

### The Three-Phase User Journey

**Phase 1 -- Discovery (Activities 1-3)**
- User onboards via natural language: "describe the kind of people or vibe you're looking for"
- AI extracts structured preferences; shown as editable chips
- User is assigned to a personality cluster pool (invisible to user)
- First activity group of up to 10 is drawn from that cluster -- product handles everything: activity type, venue, date, time -- user just shows up
- After each activity: lightweight vibe feedback (who did you click with, would you come back)
- Vibe feedback drives the next combination: strong overlap keeps the core, weak overlap reshuffles within the cluster
- No pressure on any single activity -- it is explicitly the start of a process, not a one-shot match

**Phase 2 -- Crystallization (Activities 3-5)**
- Multiple combinations from the cluster have now been tried
- The system tracks mutual feedback patterns across activity groups
- People who consistently choose each other across different combinations start getting scheduled together more
- Reshuffling slows as convergence becomes clear
- By activity 4-5, a stable core of 4-6 has emerged -- not declared by the app, but visible through repeated behavior

**Phase 3 -- Group Life (Ongoing)**
- App transitions from "find your people" mode to "power your social life" mode
- Becomes the engine for the group: group chat, shared calendar, personalised Plan recommendations based on what they've actually enjoyed together, all logistics handled
- Group chat is the backbone of this phase: the group needs a shared space to communicate between Plans, react to upcoming events, and build the relationship that keeps them together
- Presence cards become useful here: lightweight identity within the group (name, a few things about them, past Plans together) -- not a browsing profile, but a way to remember and deepen connection with people you've already met in person
- Group uses the app to keep their social life alive without effort
- Long-term retention and monetization live here

### Group Formation Architecture

The matching system operates on two tiers:

**Macro level -- Personality Cluster Pools**
- On onboarding, every user is assigned to a large personality cluster based on extracted preferences (e.g. ambitious creatives, outdoor adventurers, intellectual types).
- The cluster defines the compatible neighborhood a user lives in on the platform.
- All activity groups are drawn from within the same cluster, so macro-level compatibility is guaranteed before any micro-level matching happens.
- Clusters stay invisible to users -- they never see or interact with this layer directly.

**Micro level -- Activity Groups**
- Each activity is assigned a group of up to 10 people, drawn from the cluster pool.
- This is not a fixed friend group -- it is a trial combination.
- After each activity, vibe feedback determines what happens next:
  - Strong mutual overlap (majority click): keep the core group, swap out mismatches with new people from the cluster.
  - Weak overlap across the board: full reshuffle, new combination from the cluster.
- Multiple different combinations may be tried across activities 1-3 before a stable core emerges.
- The system feels like it is getting smarter each round, not starting over.

**Convergence -- When the Friend Group Forms**
- The system tracks mutual vibe feedback across activity groups over time.
- When the same 4-6 people consistently choose each other across different activity combinations, that pattern is the convergence signal.
- At that point the system transitions those users to Phase 3 (Group Life) and stops reshuffling.
- The friend group is never declared by the app -- it becomes obvious through repeated behavior.

**Why this model:**
- Fault-tolerant: a bad first activity means a reshuffle, not a failed user journey.
- Mirrors real life: you join a club, interact with multiple compatible people, and certain faces keep rising to the top.
- Scalable: as the platform grows, cluster pools grow, which means more combinations and better eventual matches.
- No pressure on any single activity: activity 1 is not "this is your group," it is "this is your first group."

**User-facing framing:** "We're learning who you click with. Each activity, we get smarter." Users don't need to understand clusters or reshuffles -- they just need to feel the system improving.

### Group Size Rationale

- Activity group size: up to 10. Large enough that not everyone needs to bond, small enough that activities work practically.
- The goal of the activity group is discovery, not instant friendship -- 10 is a pool to find your 4-6 from.
- Stable friend group: typically 4-6 people who consistently choose each other, within a broader social circle that may still include others from the cluster.
- Group size is not fixed or declared -- it emerges from vibe feedback convergence.

### Key Design Principles

- **No host, no facilitation.** Removing the "we are here to make friends" meta-layer is intentional. People do something they enjoy; friendships form as a byproduct.
- **Zero logistics burden.** AI decides the what, where, and when. User just shows up. This removes the activation energy that kills most social plans in the group chat.
- **Invisible AI.** The matching and curation is the product, but users never see it working. They just experience: good people, good activities, it keeps getting better.
- **Group crystallization is the aha moment.** Not the first activity, not the match -- the moment around activity 3-4 when someone realizes they've been looking forward to these and they know what to expect from the people showing up.
- **No browsing profiles, ever.** You never see someone's profile before meeting them. Compatibility is Ora's job, not the user's. This holds across every phase. What exists in Phase 3 are presence cards: lightweight identity you see *after* meeting someone in person, to connect a face to a name and deepen an existing relationship.
- **Chat follows people, it doesn't replace them.** During discovery, no chat exists between strangers -- it would create the exact awkward digital pre-meet that kills real connection. In Group Life, group chat is the product. The rule is not "no chat." The rule is "chat only where it serves a group that already exists in real life."

### Platform Strategy

- **Bootcamp MVP:** web app. Faster to build, easier to demo, no app store friction. Core AI layer (preference extraction, matching, explanations) is backend logic that works regardless of frontend.
- **Real product:** mobile-first. The use case demands it -- push notifications for upcoming activities, in-the-moment vibe feedback after meetups, ongoing group calendar checked on the go. The whole experience is IRL-first.
- **Transition:** bootcamp web work is not throwaway. AI logic, matching pipeline, and data model port directly to mobile. Frontend gets rebuilt (React Native preferred), but the intelligence transfers.

### Monetization Options

- **Cohort model:** paid 5-activity discovery program. Time-boxed, clear outcome, easier purchase decision than open-ended subscription.
- **Group subscription:** ongoing plan recommendations, shared calendar, logistics handling for formed groups.
- **B2B / partnerships:** corporate relocation/HR as acquisition channel (employees new to a city); venue/event partnerships for sponsored activity recommendations.

### Phase 2 Feature Roadmap

1. **Plan suggestion** -- 2-3 curated activity options per group per cycle, based on shared attributes and past activity ratings.
2. **Vibe feedback system** -- lightweight post-activity rating; feeds re-ranking and group crystallization logic. Designed as a behavioral data collection mechanism, not just a UX feature. Signal quality matters more than simplicity: capture who specifically you clicked with, would you see them again, group energy, would you return.
3. **Smarter matching** -- incorporate feedback signals over time; improve cold-start with behavioral data.
4. **Group formation detection** -- identify when a stable core has emerged; transition group to Phase 3.
5. **Shared group calendar** -- ongoing scheduling for formed groups; integrates with personal calendars.
6. **Personalization loop** -- learn what worked per group and per user; improve future recommendations. This is the early version of the stated-vs-revealed preference gap model: Ora starts learning the delta between what users said they wanted and what their behavior revealed.
7. **Communication layer** -- group chat is the backbone of Phase 3, not an optional add-on. WhatsApp integration is preferred for the transition (lowest friction, zero build required); native in-app group chat is the long-term target. Presence cards ship alongside -- lightweight identity (name, a few facts, shared Plans) visible within the group after meeting in person, never before.
8. **Presence cards** -- post-meeting identity layer. Not a browsing profile. Visible only within a formed group, helping members remember and connect with people they've already met.
9. **Ora behavioral model (fine-tuning)** -- first fine-tuning pass on Ora's proprietary behavioral dataset: vibe signals, convergence outcomes, stated-vs-revealed preference gaps. This is when Ora stops being a wrapper and starts being a proprietary model. Requires 12-18 months of live product data before meaningful training is possible.
10. **"Ora has learned this about you" in-product moment** -- surface what Ora has observed about a user's actual social patterns, distinct from what they said at onboarding. The product inflection point where Ora shifts from reactive tool to trusted intelligence.

### The Ora Intelligence Engine (Long-Term Vision)

The full strategic vision for Ora as a judgment-grade social intelligence model is documented separately in `/product/02-ora-intelligence-vision.md`. Key points for context here:

- Ora's long-term moat is not the product layer -- it is the behavioral data flywheel the product generates
- Every Plan run, every vibe signal, every convergence event is a training row for the future model
- The stated-vs-revealed preference gap (what users say they want vs. what their behavior shows they need) is the core proprietary intelligence Ora builds over time
- The data architecture and vibe feedback quality decisions made in the MVP directly determine whether the Phase 2 model is possible
- The deck narrative: "Ora is building the model that understands human connection. Aura is how we train it."
9. **Gap-detection follow-up questions** -- after free-text/voice input, the system detects under-specified or missing fields in the user's profile and generates targeted follow-up questions ("you mentioned you like building things; what kind of energy do you want from the people you spend time with?"). Distinct from the user-driven refinement loop -- this one is system-driven. Compatible with current MVP architecture, no schema changes required. See `/technical/02-data-model.md` forward-looking design notes.

---

## Open Questions / Decisions to Make

Resolved 2026-05-07. Full rationale in `/technical/01-mvp-decisions.md`.

- ~~**Vector store:** local in-memory cosine (swappable behind `findSimilar()`).~~ Superseded by Slice B′ (2026-05-11): Supabase Postgres + pgvector with HNSW indexes; mutual-fit cosine executed as a single SQL expression via the `<=>` operator.
- **Frontend framework:** Next.js (App Router).
- **Backend language:** Node + TypeScript via Next.js API routes.
- **Mock dataset:** ~175 LLM-generated users across 7 archetypes. See `/technical/02-data-model.md` and `/technical/03-archetypes.md`.
- **Refinement loop:** re-extract + re-rank.
- **Voice input:** voice (OpenAI Whisper) for open-ended preference questions; typed for structured fields.
- **Location:** Berlin, English-only.
- ~~**Auth:** skip for MVP, but every record carries `userId` from day one.~~ Superseded by Slice B′ (2026-05-11): magic-link via Supabase Auth, just-in-time placement at "Find my people." Email-only; phone (Twilio) is explicitly out of scope for the bootcamp MVP. Every record still carries `userId`.

## Next Steps

The build proceeds in slices. Each slice is one or more PRs against `main`. Status as of 2026-05-11.

**Slice A — Mock-data MVP shell.** ✅ Done. Next.js + Tailwind scaffold; AuroraRing + Welcome + Voice screens; OpenAI plumbing; in-memory cosine matching in `/lib/match.ts`; 175 mock users + 33 Berlin venues seeded to JSON with embeddings precomputed. Stubs in place for transcription, extraction, plan generation. PRs #1–#4 merged.

**Slice B′ — Supabase persistence + Auth.** 🟡 In progress. The bootcamp deliverable requires a deployed app with database + auth, so persistence moves ahead of the chips / Plan-card UI work to avoid rewiring later.

- Provision Supabase project (EU Frankfurt, project `aura`) — done.
- `lib/supabase.ts` — server (service-role) + browser (publishable) client factories.
- Schema: `users`, `places`, `plans` tables; pgvector extension; HNSW indexes on both embedding columns.
- One-shot migration `scripts/migrate-json-to-supabase.ts` — preserves precomputed embeddings, no OpenAI calls.
- Rewrite `lib/findSimilar.ts` as a thin RPC wrapper (`findSimilarUsers`, `findSimilarPlaces`) over the `match_users` and `match_places` Postgres functions. Prune `lib/match.ts` to keep `rankMatches()` (now RPC-backed) + `explain()` (deterministic structured-tag overlap, the explainability differentiator).
- Magic-link auth via Supabase Auth at `/auth/login` + `/auth/callback`. ✅ Landed.
- Just-in-time auth gate at "Find my people" — Welcome + Voice + Chips remain anonymous. Gate wiring lives in Slice B alongside the Plan card.
- Mock users persist with `auth_user_id = NULL` (matchable, not logged-in-able).
- Doc updates: `/technical/01-mvp-decisions.md` (vector store → pgvector, auth → magic-link) + new `/technical/04-infrastructure.md` (Supabase + Vercel + auth flow).

**Slice B — Chips review + Plan card with real matching.** `/chips` screen, Plan card screen, `lib/generatePlan.ts` real implementation (pick activity → pick venue via pgvector → pick time → pick 6–8 attendees → LLM `whyThisPlan`).

**Slice C — Real LLM pipeline.** Real Whisper transcription (`MediaRecorder` → `/api/transcribe`), real extraction LLM call (replace the `lib/extract.ts` stub), gap-detection follow-up loop capped at 2 follow-ups.

**Slice D — Invite + refinement + polish.** WhatsApp invite screen, Plan-card refinement loop ("more chill" → re-extract + re-rank), "Why these six?" dev panel, copy + motion polish.

**Slice E — Vercel deploy.** Wire env vars, deploy, smoke test live, update README with live URL.

## Change Log

- 2026-04-23: Initial project brief captured.
- 2026-04-29: Full product vision documented -- three-phase user journey (Discovery, Crystallization, Group Life), group size rationale, design principles, platform strategy (web MVP to mobile), monetization options, Phase 2 feature roadmap.
- 2026-04-29: Group formation architecture documented -- two-tier model (macro personality cluster pools + micro activity groups of up to 10), vibe feedback reshuffle logic, convergence signal definition, user-facing framing.
- 2026-04-30: Brand names decided -- product is Aura, company and AI entity are Ora. See /branding/ for full documentation.
- 2026-05-05: Clarified profiles and chat design principles. "No profiles, no chat" applies only to the discovery mechanic, not the full product. Group chat is confirmed core to Phase 3 (Group Life). Presence cards added as post-meeting identity layer. Phase 1 out-of-scope list updated to reflect these are temporary, not permanent exclusions.
- 2026-05-08: Added Ora Intelligence Engine as the long-term product vision. Full document at /product/02-ora-intelligence-vision.md. Roadmap updated with behavioral model and fine-tuning as explicit milestones. Vibe feedback system reframed as primary data collection infrastructure, not just a UX feature.
- 2026-05-07: MVP technical scope locked. Stack: Next.js + Node/TS, local in-memory vectors, Whisper voice input for preference gathering, Berlin/English-only, no auth. Data model defined with two-layer profiles (raw inputs → structured extraction → embeddings) and bidirectional cosine matching. See `/technical/01-mvp-decisions.md` and `/technical/02-data-model.md`.
- 2026-05-07: 7 macro archetypes defined as social-mode clusters (Ambitious Creators, Cultural Explorers, Scene & Nightlife, Outdoor & Active, Wellness & Inner-Work, Cozy Connectors, Sports & Crew). City-agnostic, designed to apply across Berlin / NYC / Toronto / SF / London. Bootcamp MVP matches archetype-blind to validate embedding pipeline; real product uses them as hard cluster pools per the product vision. `connectionType` field added to lookingForExtracted (close-friendships / social-circle / activity-buddies / new-city-support). Tag canonicalization moved from "defer" to "include at extraction." Gap-detection follow-up question loop and tiered match-detail disclosure captured as forward-looking design notes. See `/technical/03-archetypes.md`.
- 2026-05-07: Visual identity direction set. Anchor concept is aurora — warm aurora (coral / lavender / violet) for Aura's everyday surface, deep aurora (electric magenta / violet / indigo) for Ora's atmospheric AI presence. Two-mode system: warm cream surface for Aura, deep indigo overlay when Ora surfaces. Cabinet Grotesk for the wordmark. Aura is text-only ("aura" lowercase); Ora gets a luminous aurora-ring mark used as the app icon and the AI presence indicator. Domain candidates ranked (youraura.com leading). See `/branding/03-visual-identity.md`.
- 2026-05-07: MVP pivot — Plan-first, not people-first. Realigned the bootcamp MVP to the product vision's core unit: a Plan (activity + venue + time + curated attendees) is the user-facing payoff, not a matched-people list. Added `activityTypes` to selfExtracted (with optional `availability` and `budget`); added `Plan` schema and Plan-generation pipeline; demoted Match record to an internal artifact surfaced only inside a Plan card. UI flow restructured around a single Plan card replacing the previous Results-list screen. "Why these six?" dev/demo panel preserves matching-at-scale visibility for portfolio reviewers. See `/technical/02-data-model.md` for schemas + generation logic.
- 2026-05-07: UI flow committed. 6 screens (Welcome / Voice prompt / Follow-up loop / Chips review / Plan card / WhatsApp invite) with three named Ora moments ("Reading your aura...", "Finding your first Plan...", "Adjusting..."). Combined the two voice prompts into one open prompt with gap-detection follow-ups. Inline refinement on the Plan card. Per-attendee tiered disclosure (collapsed labels → expanded why-this-match details on tap). Aura-swatch concept (procedurally-generated aurora gradient per user) replaces profile photos. Full microcopy library + per-screen layout, motion, and surface specs in `/product/01-ui-flow.md`.
- 2026-05-08: PR #1 merged. 33 Berlin venues seeded with embeddings + OpenAI client plumbing (`lib/openai.ts`, `lib/embed.ts`, `scripts/seed-places.ts`).
- 2026-05-08: PR #2 merged. 175 mock users seeded across 7 archetypes (25 each) with `selfEmbedding` + `lookingForEmbedding` precomputed. Mix: 80% intra-archetype, 15% adjacent bridges, 5% deliberate mismatches.
- 2026-05-10: PR #3 merged. Design rebalance — Aura cream is the default surface for ~95% of screens; Ora indigo appears only as brief atmospheric moments. AuroraRing motion gentled to 7s breath, no audio-reactive (the ring is present, not responsive to the user's voice — removes the surveillance read).
- 2026-05-10: PR #4 merged. Localized Ora bloom replaces full-screen surface flip during the Processing state. The bloom is contained; the ring becomes a luminous portal; the cream world surrounds it.
- 2026-05-18: Slice B′ documentation closed out. `/technical/01-mvp-decisions.md` revised: Decision #1 vector store → Supabase Postgres + pgvector (HNSW), Decision #8 auth → magic-link via Supabase Auth (email-only, phone explicitly out of scope), Decision #4 mock dataset reflects 175 rows seeded into `users` with `auth_user_id = NULL`. Architectural Rule #2 clarified — the no-Server-Actions guardrail is about mobile-reusable data flows (extraction, matching, Plan generation), with a narrow carve-out for auth UI since Supabase has native mobile SDKs and mobile won't reuse the web auth pages. Architectural Rule #4 restated around `auth_user_id` nullability. New `/technical/04-infrastructure.md` is the operator runbook covering the Supabase project, RLS posture, three client factories, the auth flow diagram with JIT placement, Vercel env-var checklist for Slice E, local development steps, and a troubleshooting table.
- 2026-05-18: Magic-link auth landed. New routes `/auth/login` (Server Action calls `signInWithOtp`), `/auth/check-email` (confirmation), and `/auth/callback` (route handler exchanges `token_hash` via `verifyOtp`, redirects to `next`). Root `middleware.ts` + `lib/supabase/middleware.ts` refresh the session cookie on every request via `supabase.auth.getUser()` per the Supabase SSR pattern. Login pages match the Aura cream + soft aurora bloom visual language. Pages stay server-rendered; form errors flow back via `?error=` in the URL (no `useActionState` ceremony). The just-in-time auth gate at "Find my people" is wiring deferred to Slice B, once the Plan card screen exists to host the button. Operator note: the Supabase Dashboard's allowed Redirect URLs list must include `http://localhost:3000/auth/callback` for dev and the eventual Vercel callback for prod.
- 2026-05-18: Matching layer moved onto pgvector. New migration `20260518200707_match_functions.sql` defines two `SECURITY INVOKER` SQL functions: `match_users` (mutual-fit cosine, single-pass full scan, fine at 175 rows; comment notes the candidate-then-rerank switchover at ~5k) and `match_places` (one-sided, HNSW-accelerated). `lib/findSimilar.ts` rewritten as a thin RPC wrapper (`findSimilarUsers`, `findSimilarPlaces`). `lib/match.ts` pruned: dropped the in-memory `cosine()` and `score()` helpers, kept `rankMatches()` (now RPC-backed + hydrates matched rows for `explain()`) and `explain()` (deterministic structured-tag overlap, untouched). Added `scripts/smoke-match.ts` as a regression check that runs the full mutual-fit RPC end-to-end against the live DB. Sofia's top-5 returns all five from her archetype, matching the verified psql output.
- 2026-05-11: Slice B′ scoped and inserted before original Slice B. The bootcamp clarified the deliverable must be a fully deployed app with database + auth, not local-only. Supabase project provisioned (EU). The Kiro spec for embedding-match-engine updated to assume Supabase + pgvector as the data layer — mock dataset seeded into the `users` table, mutual-fit cosine executed as a single SQL expression via pgvector `<=>`, group composition still in application code. Vector store decision moves from "local in-memory" to "pgvector"; auth decision moves from "skip for MVP" to "magic-link via Supabase Auth, just-in-time placement." Next Steps section restructured as a slice plan (A done, B′ in progress, B / C / D / E queued).
