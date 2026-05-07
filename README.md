# Aura — bootcamp MVP

Aura is the consumer app. Ora is the AI inside it. This is the bootcamp MVP scaffold.

For product context start with [`PROJECT.md`](./PROJECT.md). For design and engineering details:

- [`/branding/`](./branding) — brand strategy, naming, visual identity
- [`/product/01-ui-flow.md`](./product/01-ui-flow.md) — full screen-by-screen flow
- [`/technical/01-mvp-decisions.md`](./technical/01-mvp-decisions.md) — locked tech decisions
- [`/technical/02-data-model.md`](./technical/02-data-model.md) — schemas + matching + Plan generation
- [`/technical/03-archetypes.md`](./technical/03-archetypes.md) — the 7 archetypes

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in OPENAI_API_KEY
npm run dev
```

App runs on http://localhost:3000.

## Project layout

```
/app/              Next.js App Router pages and API routes
/components/       UI components (AuroraRing, etc.)
/lib/              Extraction, matching, plan generation, embedding store
/types/            TypeScript types mirroring the data model
/data/             Mock users + places (seeded later)
/branding/         Brand docs (strategy, naming, visual identity)
/product/          UI flow spec
/technical/        MVP decisions, data model, archetypes
```

## Architectural rules (from `01-mvp-decisions.md`)

1. All extraction / matching / Plan-generation logic lives in `/lib`. Route handlers are thin wrappers.
2. Data flow is plain HTTP + JSON. No Server Actions for any flow that mobile will need to reuse.
3. Vector storage is hidden behind `findSimilar()`. No code outside `lib/findSimilar.ts` knows the implementation.
4. Every record carries a `userId`. No code path assumes "the user."

## Status

Currently runnable: Welcome screen + Voice prompt screen with stub transcription and a fake "Sounds right" handoff. Real Whisper + extraction + matching + Plan generation wire in next.
