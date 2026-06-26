# Miro Answers — Exercises 14, 15 & 16 (Aura project)

Everything you need to paste into the Miro boards. Project facts are real and
specific to Aura (Next.js 15 + Supabase, deployed on Vercel at meetonaura.com).

Screenshots in this same folder:
- `15-test-failing.png`, `15-test-passing.png` (Exercise 15)
- `16-tests-passing.png`, `16-refactor-summary.png` (Exercise 16)

---

# Exercise 15 — Controlled Failure

## What the bug was

One drift-mapping value in `lib/canon.ts` was changed so the canonicalizer
returned the wrong word:

```diff
- "chilled": "chill",
+ "chilled": "chilly",
```

`canon()` normalizes tag variants before the deterministic matcher compares
them. The unit tests in `lib/__tests__/canon.test.ts` assert the canonical
form, so this one-line change made 2 tests go red. The bug was reverted after
capturing the screenshots, the test suite is green again.

## Screenshots
- **Failing test:** `15-test-failing.png` (2 failed | 27 passed)
- **Fixed test:** `15-test-passing.png` (29 passed)

## Reflection answers (the 4 questions)

**1. Did the test protect the behavior?**
Yes. The test pins behavior, not implementation: `canon("chilled")` must equal
`"chill"`. The moment the mapping drifted, two assertions failed immediately,
before the bad value could reach the matcher and quietly lower match scores.

**2. Was the failure message clear?**
Very. Vitest printed `AssertionError: expected 'chilly' to be 'chill'` with the
exact file and line (`canon.test.ts:9:30`) and a code frame pointing at the
failing assertion. No guessing about what broke or where.

**3. Did the AI attempt shortcuts?**
The honest shortcut to watch for is editing the test to expect `"chilly"` so it
goes green without fixing anything. The project rule in
`.claude/rules/project-quality.md` forbids that ("Do not modify a test to make
it pass. Fix the implementation. The test is the contract."). The correct fix
was reverting the mapping in `lib/canon.ts`, not touching the test.

**4. What made debugging easy or hard?**
Easy: a pure function with no side effects, a precise expected-vs-received diff,
and a line number. Hard would have been a bug deeper in the matching pipeline
with no direct unit test, where you only notice scores look slightly off.

## 3 bullet observations about agent behavior
- The agent located the failure from the assertion message alone (file + line +
  expected/received) without needing to run anything else.
- The fix stayed surgical: it changed only the broken mapping value and left the
  test untouched, respecting the test as the contract.
- It re-ran the full suite after the fix to confirm green (29 passed) rather
  than assuming the one change was enough.

## 1 insight about test quality
A good unit test pins observable behavior, not internal wiring. Because
`canon("chilled") -> "chill"` is asserted directly, a silent data drift turned
into a loud, located failure instead of a vague "matches feel worse" bug that
would have been almost impossible to trace from the UI.

---

# Exercise 14 — Deployment & Monitoring with AI (Path A: Vercel)

Aura is a Next.js 15 + Supabase app deployed on Vercel, so Path A fits.

## Block 1 — GitHub Repository
- Repo: https://github.com/Bukkym/aura  (contains the full project)
- `.env` is not committed
- `node_modules` is not committed

## Block 2 — Vercel Deployment
- **Production URL:** https://meetonaura.com
- **Preview URL:** Vercel auto-creates one per branch/PR, format
  `https://aura-git-<branch>-bukkym.vercel.app`
- **Required environment variables:**
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
  ```
  (`SUPABASE_SECRET_KEY` is server-only, used by seeding scripts, never exposed
  to the browser.)

## Block 3 — CI/CD Workflow (paste the snippet + answers)

This is the real workflow now in the repo at `.github/workflows/ci.yml`:

```yaml
name: Build & Test
on:
  pull_request:
  push:
    branches: [main]
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Test
        run: npm run test      # vitest run
      - name: Build
        run: npm run build     # next build
```

- **What triggers this?** Every pull request, and every push to `main`.
- **What fails the pipeline?** A failing Vitest test or a `next build` error.
  Either one blocks the merge.
- **CI/CD =** automated build and test on every change before merge. A quality
  gate that stops broken code from reaching `main` and therefore Vercel.

Status: this pipeline is live and passing (verified green run on the PR that
added it, then re-verified after the Supabase secrets were added).

## Monitoring — Health Endpoint

Added at `app/api/health/route.ts`:

```
GET /api/health  ->  { "status": "ok", "service": "aura", "timestamp": "..." }
```

Used for uptime monitoring and as a lightweight smoke check. Test it locally:
```
curl http://localhost:3000/api/health
```
Or in production:
```
curl https://meetonaura.com/api/health
```

## Attention — Never Commit Secrets
API keys, database credentials, and tokens are never committed. They live in
platform secret stores: Vercel environment variables for runtime, GitHub Actions
secrets for CI (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

## Tips & Tricks — Reproducible deployments
Vercel builds the same Next.js artifact and promotes it through preview to
production, so what you test in a preview deploy is what ships. "Build once,
deploy everywhere."

---

# Exercise 16 — Clean Code, Refactoring & Robustness (Aura project)

**Area picked: the AI Workflow / Plan API** (`app/api/plan/*` routes plus the
`/lib` modules they call). This is where Aura turns a host profile into a
matched plan, so it is the highest-value area to keep maintainable.

## Column 1 — PICK ONE AREA (3 technical-debt sticky notes)

1. **Repeated auth + JSON-parse boilerplate in every route.** Every handler
   (`create`, `confirm`, `decline`, `refine`, `current`, `plans`) repeats the
   same ~12 lines: `createClient()`, `sb.auth.getUser()`, the `if (!authUser)
   return 401`, and the `try { await request.json() } catch { return 400 }`.
   Same code copy-pasted six times.

2. **The `create` route handler does too much.** Its `POST` is ~140 lines doing
   auth, JSON parse, display-name derivation, archetype assignment, a user
   lookup-then-insert-or-update branch, plan generation, persistence, and
   response shaping all inline. The project's own rule says routes should be
   thin wrappers with logic in `/lib`.

3. **Pure business logic lived inside the route, untested.**
   `deriveDisplayNameFromEmail()` was a pure function defined at the bottom of
   `create/route.ts`, so it could not be reused and had no unit test, despite
   having real edge cases (missing email, empty local part).

## Column 2 — ENGINEERING PRINCIPLES (map each issue to a principle)

| # | Tech debt | Principle |
|---|-----------|-----------|
| 1 | Repeated auth + JSON-parse boilerplate in every route | DRY (Don't Repeat Yourself) |
| 2 | `create` route mixes auth, upsert, archetype, generate, persist | Single Responsibility Principle |
| 3 | Pure display-name logic stuck in the route, untested | Separation of Concerns (testability) |

## Column 3 — PLAN REFACTORING (one concrete improvement per problem)

1. **DRY:** extract `requireUser(sb)` and `readJsonBody(request)` helpers into
   `lib/apiAuth.ts`. Each route calls them instead of re-implementing the
   401 / 400 handling. Bad: 6 copies of the same guard. Good: one tested helper.

2. **SRP:** extract the user upsert (lookup, archetype assign, insert-or-update)
   into `upsertHostUser(sb, authUser, extracted)` in `lib/userRow.ts`. The route
   becomes: authenticate, parse, call `upsertHostUser`, `generatePlan`,
   `persistPlan`, return. Bad: one 140-line function. Good: a thin controller
   over named lib functions.

3. **Separation of Concerns:** move `deriveDisplayNameFromEmail()` into
   `lib/userRow.ts`, export it, and unit-test it. Bad: pure logic buried in a
   route, untestable. Good: a reusable, tested helper.

## Column 4 — EXECUTE REFACTORING (done: refactoring #3 + robustness)

I executed refactoring #3, the safest self-contained win, and added the
robustness piece (tests):

- Moved `deriveDisplayNameFromEmail()` out of `app/api/plan/create/route.ts`
  and into `lib/userRow.ts` (exported, reusable).
- Updated the route to import the helper and deleted the inline copy, so the
  route is now thinner.
- Added `lib/__tests__/userRow.test.ts` with 8 unit tests covering the edge
  cases: capitalization, dots in the local part, missing email, empty local
  part, already-capitalized name, plus 3 tests for `parseVector()`.

**Result:** `tsc --noEmit` clean, `vitest` 42 passed (42), up from 29. This also
satisfies the project rule that every new `/lib` function must have a test.

Screenshots for the EXECUTE box:
- `16-refactor-summary.png` (before/after diff + summary)
- `16-tests-passing.png` (green test run, userRow.test.ts marked new)

## Robustness note
The robustness improvement here is **test coverage** of edge cases that
previously had none: a missing email or an empty local part now have asserted,
documented behavior (`"Friend"`) instead of being silent assumptions. The next
robustness step in this area would be the `readJsonBody` helper from refactoring
#1, which centralizes the malformed-body error handling that every route needs.
