# Miro Answers - Exercises 17 & 18 (Aura project)

Paste-ready text for each Miro board. Everything is real and specific to Aura
(Next.js 15 + Supabase + OpenAI, deployed on Vercel at meetonaura.com).

Evidence files in this same folder:
- `17-guardrail-run.txt` - real fail to pass transcript of the lib-test guardrail
- n8n screenshots (DESIGN / IMPORT / PRESENT) get added once the workflow is
  built live in your n8n instance

What got built for these two exercises:
- Ex 17 guardrail: `scripts/check-lib-tests.ts`, wired into `npm run
  check:lib-tests` and into `.github/workflows/ci.yml`, plus two new test files
  (`lib/__tests__/match.test.ts`, `lib/__tests__/whyTemplates.test.ts`).
- Ex 18 entry point: `components/FeedbackWidget.tsx`, mounted in
  `app/layout.tsx`, env-gated by `NEXT_PUBLIC_N8N_WEBHOOK_URL`. Reference
  workflow at `n8n/aura-feedback-classifier.json`.

---

# Exercise 17 - Directing Agentic AI, Teams & Managing Risks

## Board 1 - TASK (one sticky per task, dropped into a lane)

**AI Autonomous** (low risk, repetitive, verifiable)
- Add tag-drift mappings to `lib/canon.ts` (e.g. "chilled" to "chill"). Pure,
  table-driven, every entry is pinned by a unit test.
- Scaffold a new thin API route + health/uptime wiring. Boilerplate the suite
  and the build verify.

**AI + Human Review** (AI implements, human verifies)
- Write unit tests for the matching / scoring / template logic in `/lib`.
- Refactor the plan API routes into thin controllers over `/lib` helpers
  (the Exercise 16 work).
- Build the n8n feedback-classifier workflow + in-app widget (Exercise 18).

**Human-led** (strategic, ambiguous, high risk)
- Tune the mutual-fit weights `W` in `lib/match.ts`. This encodes what "a good
  match" means, a product call, not a code call.
- Define the archetype taxonomy and connection-type model, and the
  pool-liquidity / monetization strategy.

## Board 2 - RISKS

**Task chosen:** "Have the AI write unit tests for the matching, scoring, and
`why this plan` template logic in `/lib`."

| Possible failure / Risk | Impact | Why the agent might do this |
|---|---|---|
| Tests assert tautologies or just restate the implementation (e.g. `expect(scorePair(a,b)).toBe(scorePair(a,b))`) instead of pinning real behavior | Suite is green but a real regression (a flipped weight, a drifted canon mapping) sails straight through. False confidence. | LLMs optimize for "produce a passing test file", and the cheapest passing test is one that asserts what the code already does. |
| A module is marked "done" with no test at all, or the thing under test is mocked away (mock `scorePair` itself) | Untested pure logic (the matcher, the `why this plan` copy) ships. Drift becomes a silent "matches feel worse" bug with no failing test to locate it. | The agent's goal is "task complete". With no hard check, skipping the test is the shortest path. |
| The AI edits an existing test to match buggy output instead of fixing the code (changes expected `"chill"` to `"chilly"`) | The test stops being a contract. The bug is now blessed and will never go red again. | Editing one assertion is faster to green than diagnosing the root cause. |

## Board 3 - GUARDRAILS (one sticky per guardrail)

**Guardrail 1: Lib-test presence gate** (architectural constraint, automated)
- Where it runs: `npm run check:lib-tests` locally and as a step in CI before
  Test + Build (`.github/workflows/ci.yml`).
- What it protects against: Risk 2. Every pure-logic `/lib` module must have a
  `__tests__/<name>.test.ts` that actually imports it, or the build fails.

**Guardrail 2: CI test + build gate** (CI validation)
- Where it runs: GitHub Actions on every pull request and push to `main`.
- What it protects against: regressions reaching `main`. `vitest run` plus
  `next build` must pass, so a red test or a broken build blocks the merge.

**Guardrail 3: Mandatory PR review + the "test is the contract" rule**
- Where it runs: human PR review, backed by `.claude/rules/project-quality.md`
  ("Do not modify a test to make it pass. Fix the implementation.").
- What it protects against: Risk 1 and Risk 3, the tautological or weakened
  tests that no automated presence check can catch.

## Board 4 - IMPLEMENTATION (the guardrail I implemented today)

Implemented Guardrail 1, the lib-test presence gate.

- **What happened:** Ran `npm run check:lib-tests` against the repo. It reported
  `4/6 pure-logic modules covered` and failed (exit 1), flagging `lib/match.ts`
  (scoring) and `lib/whyTemplates.ts` (templates) as having no test. Those are
  the two module kinds the project rule names explicitly.
- **Agent adjustment:** Added `lib/__tests__/match.test.ts` (score ordering,
  disjoint users near zero, canonicalization of drift variants, score stays in
  [0,1]; plus `explain` shared-tag cases) and `lib/__tests__/whyTemplates.test.ts`
  (deterministic output, venue + lowercased time present, tagless fallback, no
  "undefined" placeholder). Then wired the check into CI as a step before Test.
- **Final result:** Guardrail green, `6/6` covered. Test suite `56 passed`, up
  from `42`. CI now fails any PR that adds a pure-logic `/lib` module without a
  test. Full transcript in `17-guardrail-run.txt`.

## Board 5 - REFLECTION

- **What guardrail would you add next?** A quality gate that goes beyond
  presence: assert each `/lib` export is actually called in its test (catch a
  test that imports a module but never exercises the new function), or a small
  mutation-testing smoke that flips a weight or a canon mapping in CI and
  asserts a test goes red. That directly attacks the tautological-test risk a
  presence check cannot see.
- **What should humans still review?** The matching weights and the definition
  of "a good match" (product judgment), and the substance of AI-written
  assertions: do they pin real behavior or just restate the code? Automated
  gates prove a test exists and is green. Only a human confirms it tests the
  right thing.

---

# Exercise 18 - AI-native workflow classifier (n8n)

**Repetitive task chosen:** triaging inbound user feedback for Aura. Today every
message would be read and routed by hand. The pipeline classifies it and routes
it automatically.

## Board 1 - CREATE ENTRY POINT

Flow (implemented in `components/FeedbackWidget.tsx`, mounted in
`app/layout.tsx`):

```
Chat icon ("?" button, bottom-right)
  -> click
Panel opens ("Tell Ora what you think")
  -> user types in the message field
Click "Send"
  -> POST { message } to the n8n webhook
Panel shows the returned category + reply
```

Requirements met: chat/help icon in the UI (the FAB), message input field
(textarea), send button, POST request to an n8n webhook. The widget is
env-gated by `NEXT_PUBLIC_N8N_WEBHOOK_URL`, so it renders nothing until the
webhook exists.

**Request body sent to n8n** (minimum `{ "message": "user message" }`):

```json
{
  "message": "The boulder gym match last week felt perfect, but the time was too early for me."
}
```

**Response the widget renders back:**

```json
{ "category": "match_feedback", "reply": "Thanks, glad the match landed. Noting the timing for next time." }
```

## Board 2 - DESIGN WORKFLOW (the plan summary to paste)

Pattern: **Webhook -> AI classification -> Switch -> Action.**

1. **Trigger - Webhook.** `POST /webhook/aura-feedback`, body `{ message }`.
2. **AI reasoning step - OpenAI (gpt-4o-mini).** Classifies the message into
   exactly one of six categories: `bug_report`, `feature_request`,
   `match_feedback`, `question`, `praise`, `other`, and drafts a one-line
   acknowledgement. Output format: strict JSON `{ "category", "reply" }`.
3. **Switch - Route by Category.** Switches on `{{ category }}` into six
   branches (one per category) plus a fallback, so each class can carry its own
   side effect (log bugs to a sheet, send feature requests to a backlog channel,
   flag `match_feedback` for the matching team, and so on).
4. **Action - Respond to Webhook.** Returns `{ category, reply }` to the widget.
   Each Switch branch is the attach point for the per-category action.

- **Decision the AI makes:** which one of six categories, plus a short reply.
- **Output format:** strict minified JSON, so the Switch can route on a single
  field.
- **What happens after the AI step:** the Switch routes by category, then the
  webhook responds and the widget shows the reply.

Reference workflow committed at `n8n/aura-feedback-classifier.json`.

## Board 3 - IMPORT TO n8n (import errors + fixes)

Built live in the n8n cloud instance (FairTix Automations project, n8n 2.27.4).
The `aura-feedback-classifier.json` was imported by copying it to the clipboard
and pasting onto the canvas (Cmd+V). All five nodes and their connections came
in cleanly: Webhook, AI Classify, Route by Category, Shape Response, Respond to
Widget.

Errors hit and the fixes:
1. **Wrong-provider credential.** n8n auto-mapped the AI Classify node to an
   existing credential ("OpenAi account 7") that actually held an Anthropic key
   (`sk-ant-...`), so the run failed with "Authorization failed - Incorrect API
   key provided: sk-ant-...". Fix: switched the credential. "n8n free OpenAI API
   credits" was out of credits (400 on the model list), so I selected
   "OpenAi account 3", a valid OpenAI key, and the model list loaded.
2. **Model reset on credential change.** Switching the credential cleared the
   Model field ("Parameter Model is required"). Fix: reselected `gpt-4o-mini`.
3. **AI output path.** With Simplify Output + Output Content as JSON on, the node
   returns the parsed object at `message.content`, so the Switch reads
   `{{ $json.message.content.category }}`. No change needed, it matched.

After the fixes the test webhook returned the expected JSON, the workflow was
published, and the production webhook was verified.

## Board 4 - PRESENT YOUR FINAL WORKFLOW

- **Workflow:** "Aura Feedback Classifier" (FairTix Automations project),
  status Published.
- **Production webhook:** `POST https://ai-software-egnineering.app.n8n.cloud/webhook/aura-feedback`
- **Verified live** with three message types, all HTTP 200:

  | Message sent | category returned |
  |---|---|
  | "The boulder gym match last week felt perfect, but the time was too early for me." | `match_feedback` |
  | "The app crashed when I tapped Confirm on my plan." | `bug_report` |
  | "Could you add a way to suggest a different time for a plan?" | `feature_request` |

  Example response body: `{"category":"match_feedback","reply":"Thanks for the feedback, we appreciate it!"}`

- **Screenshot of the n8n workflow:** the published graph
  (Webhook -> AI Classify -> Route by Category -> Shape Response -> Respond to
  Widget), all nodes green after a successful run, captured in the build session.
