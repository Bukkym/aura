# MVP Technical Decisions

Locked decisions for the bootcamp MVP. Resolves the Open Questions in PROJECT.md.

Date locked: 2026-05-07

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Vector store | Local in-memory (cosine over arrays) | <500 mock users; no API key, no cost, no latency. Swappable behind a `findSimilar(embedding)` interface, so migration to sqlite-vec or Pinecone is later refactor, not a rewrite. |
| 2 | Frontend framework | Next.js (App Router) | Single deploy, API routes built-in, no CORS plumbing. |
| 3 | Backend language | Node + TypeScript (Next.js API routes) | Pairs with #2. Same language across web today, API, and React Native mobile later. Heavy ML work, if ever needed, becomes a small Python sidecar. |
| 4 | Mock dataset | ~150 LLM-generated users, schema-aligned | Enough variety to surface non-obvious matches without making debug painful. Replaced by real users on day 1 of production, so zero technical debt. |
| 5 | Refinement loop | Re-extract + re-rank (not just filter) | "More social" updates the visible chips, then re-ranks. This is the demo moment that proves the AI-first thesis. |
| 6 | Voice input | Voice for open-ended preference questions, typed for structured fields. OpenAI Whisper API for transcription. | User typing long qualitative answers is bad UX. Whisper has strong multilingual quality, and the same pattern (record → POST → transcribe → extract) ports directly to mobile via `expo-av`. |
| 7 | City | Berlin, English-only | Rich venue/event data (Google Places, Resident Advisor, Eventbrite, Meetup). Target users (expats, new-to-city) navigate Berlin in English. German support is a Phase 2 concern. |
| 8 | Auth | Skip for MVP, but design with `userId` everywhere | Hardcode a demo user ID. Every record (preferences, matches, etc.) carries a `userId` field from day one. Clerk/Auth.js layers in later in 30 min without schema rework. |

## Architectural rules to protect future portability

These are not decisions, they are guardrails that make sure the locked stack does not paint us into a corner later.

1. **All extraction/matching/ranking logic lives in `/lib`, not in route handlers.** Route handlers are thin wrappers that parse the request, call the lib, and return JSON. This is what allows the same backend to serve the React Native mobile app later, and what allows the API to be lifted out of Next.js into a standalone service if we ever want that.
2. **Data flow is plain HTTP+JSON.** No Server Actions and no RSC-tightly-coupled data fetching for any flow that mobile will need to reuse. Server Components are fine for purely presentational/server-rendered UI; just do not put extraction or matching behind them.
3. **Vector storage is hidden behind a `findSimilar(embedding, k)` function.** No code outside that module knows whether vectors live in memory, in sqlite-vec, or in Pinecone.
4. **Every record has a `userId` field.** No code path assumes "the user." Auth becomes a 30-minute add later.
