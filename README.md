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

## Auth (magic link + 6-digit code)

Sign-in is magic-link via Supabase Auth, gated just-in-time at "Find my people" (Welcome / Voice / Chips stay anonymous). Two ways to complete sign-in from the email:

1. **Click the link** → `/auth/callback` exchanges the token → lands on `next`.
2. **Type the 6-digit code** on `/auth/check-email` → `verifyOtp` → lands on `next`. This path exists because email scanners pre-fetch links and consume the single-use token; a typed code can't be pre-fetched.

Sign-out: the `/plan` screen shows a "Sign out" control (top-right) that POSTs to `/auth/logout`.

### Operator steps (Supabase Dashboard)

- **Authentication → URL Configuration → Redirect URLs**: add `http://localhost:3000/auth/callback` (dev) and the production callback URL.
- **Authentication → Email Templates → Magic Link**: the template body must include `{{ .Token }}` so the 6-digit code appears in the email. The default template only renders the link.
- **Free tier** rate-limits sign-in emails (a few per hour per address). Pre-test the demo account well before a live demo, or wire custom SMTP (Resend) per Slice 6.

### Manual auth smoke (demo dry-run)

1. `npm run dev`, open `/auth/login`, enter a real email, submit.
2. Open the email, either click the link or copy the 6-digit code into `/auth/check-email`.
3. Confirm you land authenticated (e.g. on `/plan`).
4. Click "Sign out" on `/plan`, confirm you return to `/` and `/plan` redirects back to `/auth/login`.

## Status

Module 3 build in progress (chip-first onboarding, deterministic matching, no runtime AI). See `PROJECT.md` Next Steps for the slice plan. Auth productionization (Slice 1) landed the OTP code path and sign-out.
