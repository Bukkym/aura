# Ora Agent: Voice-First Assistant + Voice Onboarding (Plan)

Canonical, in-repo plan for the AI agent build that covers bootcamp exercises
19, 20, and 21. Written to be resumable across sessions. Status checkboxes track
progress.

Started: 2026-06-29. Owner: Bukky. Agent: Claude Code.

---

## 1. Goal & scope

Build **Ora** as a voice-first (text optional) assistant inside Aura, in two
use cases, and finally implement the real voice -> extract -> embed pipeline
that Module 3 deferred.

- **Use case A: in-app task agent.** "What would you like to do today?" The user
  speaks or types; Ora performs a task. **Hero capability: natural-language
  refinement** ("make it more outdoorsy, smaller, a chill crowd, a different
  night") which re-matches by talking instead of editing chips, the clearest
  button-beating win and the strategically valuable "refinement loop = training
  data" signal from [02-ora-intelligence-vision.md](../product/02-ora-intelligence-vision.md).
  Supporting tools the agent can also call: **request a new plan**, **withdraw
  from the current plan**, **list my plans**. Later: conversational plan request
  with one-off constraints, match explanation, and feedback capture.
- **Use case B: onboarding voice agent.** The user describes themselves in
  natural language; Ora extracts structured preferences, and if anything
  required is missing it **asks follow-up questions** until the profile is
  complete enough to create a first match. This is Module 4 from
  [05-onboarding-spec.md](05-onboarding-spec.md) §6.
- **Voice pipeline (explicitly in scope):** real transcription
  ([lib/transcribe.ts](../lib/transcribe.ts)), real extraction
  ([lib/extract.ts](../lib/extract.ts)), and runtime embedding of real users so
  they land in the same vector space as the seed pool.

**Out of scope for now** (noted so we don't drift): the public landing-page
"answer questions about Aura" Q&A bot (low impact, can reuse the same engine
later), text-to-speech polish beyond the browser's built-in voice, and any
behavioral-learning (Ora "Watches"/"Knows", see
[02-ora-intelligence-vision.md](../product/02-ora-intelligence-vision.md)).

---

## 2. Decisions (locked unless noted)

| Decision | Choice | Why |
|---|---|---|
| Generation LLM | **Anthropic Claude**, behind a provider interface so we can switch to OpenAI later | User choice; matches [04-ai-model-strategy.md](04-ai-model-strategy.md). Key already added. |
| Retrieval | **RAG, in-memory vectors** | User choice. Embed the knowledge base once at build time to JSON, cosine-match at query. No DB migration, fully unit-testable. |
| Embeddings | **OpenAI `text-embedding-3-small`** | Must match the seed pool's model ([lib/openai.ts](../lib/openai.ts) `MODELS.embedding`), or real users land in a different sub-region than seed users. |
| Transcription (STT) | **OpenAI Whisper** (`whisper-1`), browser Web Speech as a no-key fallback | We already have the OpenAI key; `MODELS.whisper` is wired. |
| Speech out (TTS) | Browser `SpeechSynthesis` to start | Free, no key, good enough for voice-first v1. |
| RAG's role | **Knowledge grounding for the agent** (so Ora can explain Aura / answer incidental questions while doing tasks), and the Ex 21 retrieval layer | The agentic tasks run on tool-calling; RAG grounds the conversation. |

**Important shift this introduces:** Module 3 deliberately kept the request path
AI-free (`EMBED_ALLOW_RUNTIME` guard in [lib/embed.ts](../lib/embed.ts)). This
build intentionally adds runtime LLM + embedding calls on the new agent/voice
routes. We will relax that guard for the specific new server routes that
legitimately need it, not globally.

---

## 3. Architecture

Provider-agnostic AI layer, thin API routes, logic in `/lib` (per the project
architecture rules), every new pure-logic lib function unit-tested (enforced by
`npm run check:lib-tests`).

```
Voice in (mic) ──> /api/transcribe ──(Whisper)──> transcript
                                                      │
Text in ──────────────────────────────────────────────┤
                                                      ▼
                                          lib/ai (Claude, provider-abstracted)
                                                      │
        ┌─────────────────────────────────────────────┼─────────────────────────────┐
        ▼                                             ▼                               ▼
  RAG grounding                              Tool calling (in-app)          Extraction (onboarding)
  lib/rag/retrieve.ts                        request_new_plan               lib/extract.ts -> chip taxonomy
  (cosine over JSON embeddings)              withdraw_current_plan          lib/onboarding/missing.ts
        │                                    list_my_plans                  (which required fields missing)
        ▼                                             │                               │
  knowledge/*.md  ── build script ──> data/knowledge-embeddings.json        follow-up question loop
```

**New / changed modules**
- `lib/ai/provider.ts` — provider interface + Claude implementation (`generate`,
  `generateWithTools`), model + key config. Switchable to OpenAI later.
- `lib/rag/retrieve.ts` — pure cosine retrieval over the prebuilt JSON. Tested.
- `lib/rag/chunk.ts` — pure markdown chunker. Tested.
- `scripts/build-knowledge-embeddings.ts` — embeds `knowledge/*.md` to
  `data/knowledge-embeddings.json` (build-time, uses OpenAI).
- `knowledge/*.md` — the knowledge base (>= 10 points; focused files, headings).
- `lib/ai/oraAgent.ts` — system prompt + RAG context + guardrails + tool wiring.
- `lib/ai/tools.ts` — tool definitions mapped to existing lib (generatePlan,
  declinePlan, listPlanSummaries). Thin, tested where pure.
- `lib/extract.ts` — real Claude extraction to the canonical chip taxonomy.
- `lib/onboarding/missing.ts` — pure: given a partial profile, return the
  required fields still missing (per onboarding spec minimums). Tested.
- `lib/transcribe.ts` — real Whisper call (server-side).
- `app/api/transcribe/route.ts` — accepts audio, returns transcript.
- `app/api/ora/chat/route.ts` — in-app agent turn (validates input, calls lib).
- `app/api/onboarding/converse/route.ts` — onboarding extraction turn.
- UI: an in-app "Ask Ora" chat surface, and wiring the onboarding `/voice`
  screen into the conversational extraction loop.

**Guardrails (Ex 21):** no relevant context -> fallback answer; restrict domain
to Aura; validate tool inputs before executing; never expose other users' data;
the deterministic matcher remains the source of truth for who gets matched (the
LLM orchestrates, it does not invent matches).

---

## 4. Exercise mapping

- **Ex 21 (AI Chatbot, naive/RAG):** the in-app "Ask Ora" assistant. Knowledge
  base = `knowledge/*.md`; Architecture = the table in §3; Prompt design = the
  Ora system prompt; Guardrails = above; Implement = a working chat response.
- **Ex 19 (LLM, MCP, LangChain, Vector):** the integration design around Ora.
  User interaction = onboarding voice + in-app "what would you like to do today".
  Agent's job = extract preferences, find/leave plans, recommend. Access =
  knowledge base (RAG/vector), the matching lib, the user's profile + plans
  (read/write via API), transcription. We use the Anthropic SDK directly, not
  LangChain (noted with rationale); vector = the in-memory RAG store.
- **Ex 20 (Context engineering + sub-agents):** the TASK is building this very
  feature across many files. Context strategy = `/compact` decisions. Sub-agent =
  a **read-only** context-gathering agent (`.claude/agents/`) that maps the
  matching/onboarding/API surface so the main agent stays lean.

---

## 5. Phased build (status)

- [x] **Phase 0 — Foundation.** DONE. `lib/aiProvider.ts` (Anthropic, provider
  seam, `generateText` + `generateWithTools`), `@anthropic-ai/sdk` added,
  `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` in env example (default
  `claude-opus-4-8`). Verified via `npm run smoke:ora`.
- [x] **Phase 1 — RAG.** DONE. `knowledge/*.md` (5 files, 23 chunks), pure
  `lib/ragChunk.ts` + `lib/ragRetrieve.ts` (cosine + top-k + minScore fallback),
  `scripts/build-knowledge-embeddings.ts` -> `data/knowledge-embeddings.json`
  (1536-dim, OpenAI). Tests: 71 passing. Smoke: grounded answers + correct
  out-of-scope fallback. Flat module layout keeps the lib-test guardrail
  covering them (now 8/8).
- [x] **Phase 2 — In-app agent.** DONE (text). `lib/oraTools.ts` (pure
  `ORA_TOOLS` + `executeOraTool`): hero `refine_plan` (NL -> activity +
  fresh_group, calls generatePlan/persistPlan), plus `request_new_plan`,
  `withdraw_current_plan`, `get_current_plan` (all scoped to the auth'd user via
  the existing lib). `lib/oraAgent.ts` runs the tool-calling loop with an
  injected runner. Thin `app/api/ora/chat/route.ts` (auth + RAG grounding +
  agent). UI `components/AskOra.tsx` + `app/ora/page.tsx`. `lib/embed.embedQuery`
  is the explicit runtime-embedding opt-in for RAG queries. Tests 80 passing;
  guardrail 10/10. Smoke (`npm run smoke:ora-agent`) verified: refinement maps
  "outdoorsy" -> hiking, knowledge Qs answer grounded with no tool, and
  "cancel my plan" confirms before withdrawing. Voice in Phase 3; live DB
  execution of the tools is pending a real signed-in session (auth-gated).
- [x] **Phase 3 — Voice pipeline.** DONE. Real `lib/transcribe.ts` (OpenAI
  Whisper, `MODELS.whisper`) behind a thin, un-auth'd `app/api/transcribe/route.ts`
  (multipart `audio`, validates type + 25MB cap, try/catch). Real `lib/extract.ts`
  (Claude `generateText` -> JSON) whose deterministic half is the pure, unit-tested
  `lib/extractNormalize.ts`: parses the reply (fence/prose tolerant), clamps every
  tag to the closed taxonomy in 05-onboarding-spec §3 via `lib/canon.ts` (keyed by
  canonical root so chip-plural forms like "dinner parties" survive), maps friendly
  connection labels, collapses "anywhere" -> ["any"]. It deliberately does NOT
  inject skip-defaults, so Phase 4's missing-field checker can see real gaps.
  Runtime embedding for real users: `lib/embed.embedProfile` (same opt-in as
  `embedQuery`, `text-embedding-3-small`), wired best-effort into
  `/api/plan/create` (backfills `self_embedding`/`looking_for_embedding`, never
  blocks plan creation). Tests 96 passing (+16); guardrail 11/11; tsc clean.
  Smoke (`npm run smoke:extract`) verified real Claude extraction lands entirely
  in-taxonomy. Pending live check: `/api/transcribe` against real audio (no
  fixture yet) and the `/voice` UI wiring, which lands with Phase 4.
- [x] **Phase 4 — Onboarding agent.** DONE. Pure, tested `lib/onboardingMissing.ts`
  (which required chips are still below their minimum, aligned to the chip-flow
  gate, not the prose spec, so the loop asks for exactly what the chips will
  demand; mirrored lookingFor fields are not asked separately). DI orchestrator
  `lib/onboardingAgent.ts` (`onboardingConverseTurn`: re-extract the whole
  conversation, decide ask-one-more vs hand-off, capped at maxAsk follow-ups so
  the prefilled chips are the safety net) with injected extract/ask fns, tested
  with stubs. Thin `app/api/onboarding/converse/route.ts` (un-auth'd, validates
  utterances, Claude phrases the follow-up with the canned question as fallback).
  `/voice` wired: `VoiceTemplate` now records real audio (MediaRecorder) ->
  `/api/transcribe` -> `onboardingConverseTurn`, looping through `ScFollowup`
  until done, then `draftToSelections` prefills `ScChips` (the confirm/edit
  surface). Every voice step degrades to the chip flow if mic/transcription/
  converse fails. Profile + first plan + embedding reuse the existing
  `aura:draft` -> `/api/plan/create` path (Phase 3 added the embedding there).
  Tests 106 passing (+10 from onboardingMissing + onboardingAgent);
  guardrail 13/13; tsc clean. Smoke
  (`npm run smoke:onboarding`) verified: thin opening draws a follow-up, rich
  description + one answer completes. Live preview verified the screens render
  and the no-mic fallback drops cleanly into the chips; the converse route's
  validation returns 400s correctly (the live Claude call is blocked only by the
  preview server's network sandbox, proven working via the smoke).
- [~] **Phase 5 — Ex deliverables.** MOSTLY DONE.
  `.claude/agents/aura-context-mapper.md` (Ex 20 read-only sub-agent) created.
  Miro answers updated for Phases 3-4: `exercise-screenshots/MIRO-ANSWERS-19-20-21.md`
  (now 106 tests / 13/13 guardrail, onboarding + voice marked built). Evidence
  refreshed: `exercise-screenshots/19-21-ora-agent-run.txt` re-run with all four
  smokes (ora, ora-agent, extract, onboarding) on real Claude + embeddings.
  Remaining (manual): save PNG screenshots into `exercise-screenshots/` and drag
  them onto the Miro boards. The live `/voice` screen renders in the dev preview
  (Ora ring + "tap to speak"); capture it plus the smoke-evidence text.

Resume rule: pick the first unchecked phase. Each phase ends with tests green
(`npm run test`) and the lib-test guardrail green (`npm run check:lib-tests`).

---

## 6. Open questions / risks

- **Auth gate vs. demo.** The in-app agent lives behind auth, which blocks
  browser preview verification. Plan: verify via unit tests + API calls (curl
  with a session), and a minimal UI; capture screenshots where possible. Decide
  later whether a dev-only unauth test surface is worth it.
- **Runtime cost / latency.** Each onboarding turn = 1 Whisper + 1 Claude call;
  each agent turn = 1 Claude (+ optional Whisper, + 1 query embedding for RAG).
  Acceptable for v1; cache the knowledge embeddings (build-time) so only the
  query is embedded at runtime.
- **Extraction fidelity.** Claude must map free text onto the *closed* chip
  taxonomy and canonicalize (`lib/canon.ts`), not invent tags. Mitigation: pass
  the allowed vocab in the prompt + canonicalize + downweight unknowns.
- **Tool safety.** Tools mutate user state (create/withdraw plans). Mitigation:
  confirm destructive actions, validate inputs, scope every tool to the
  authenticated user only.

---

## 7. Surfaced pending MVP items (not blockers for this work)

From [08-future-considerations.md](08-future-considerations.md) §8, items that
touch this area but are not required here: real attendee-leave on *shared* plans
(today "leave" = withdraw your own request, which the agent's withdraw tool will
use); skippable activity-request/onboarding split; seed display-name polish.
These can be picked up after, and are noted so they are not forgotten.
