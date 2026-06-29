# Miro Answers - Exercises 19, 20 & 21 (Aura project)

Paste-ready text for each board. Everything maps to real, committed code on the
`ora-agent` branch (Next.js 15 + Supabase + OpenAI embeddings + Anthropic Claude).

Plan of record: [technical/09-ora-agent-plan.md](../technical/09-ora-agent-plan.md).
Working evidence: [19-21-ora-agent-run.txt](19-21-ora-agent-run.txt) (real Claude +
embedding runs). Ex 20 sub-agent artifact:
[.claude/agents/aura-context-mapper.md](../.claude/agents/aura-context-mapper.md).

What got built for these three exercises:
- `lib/aiProvider.ts` (Claude, provider-swappable), `lib/ragChunk.ts` +
  `lib/ragRetrieve.ts` (in-memory vector RAG), `knowledge/*.md` +
  `data/knowledge-embeddings.json`, `lib/oraTools.ts` + `lib/oraAgent.ts`
  (the in-app agent), `app/api/ora/chat/route.ts`, `components/AskOra.tsx` +
  `app/ora/page.tsx`, and the read-only sub-agent above.
- Voice pipeline (Phase 3): real `lib/transcribe.ts` (Whisper) +
  `app/api/transcribe`, real `lib/extract.ts` (Claude) with the pure, tested
  `lib/extractNormalize.ts` clamping to the closed chip taxonomy, and runtime
  user embedding (`lib/embed.embedProfile`) backfilled in `/api/plan/create`.
- Onboarding voice agent (Phase 4): pure `lib/onboardingMissing.ts` +
  DI orchestrator `lib/onboardingAgent.ts`, `app/api/onboarding/converse`, and
  the `/voice` screen wired to record -> transcribe -> extract -> follow-up loop
  -> prefilled chips.
- 106 tests passing, lib-test guardrail 13/13, tsc clean. Smokes:
  `smoke:ora`, `smoke:ora-agent`, `smoke:extract`, `smoke:onboarding` (see
  [19-21-ora-agent-run.txt](19-21-ora-agent-run.txt)).

---

# Exercise 19 - LLM, MCP, LangChain & Vector integration

Goal: design how an AI agent integrates into the portfolio project. Aura's agent
is Ora.

## Board 1 - AI AGENT INTEGRATION

### USER INTERACTION (where the agent appears, up to 3)
1. **In-app "Ask Ora" chat** (`/ora`). "What would you like to do today?" A
   signed-in user talks or types to refine, create, or withdraw a plan, or ask
   how Aura works. Built: `components/AskOra.tsx`.
2. **Onboarding** (voice or text). The user describes themselves and Ora
   extracts a structured profile, asking follow-ups until it can make a first
   match. Built: `lib/onboardingAgent.ts` + `app/api/onboarding/converse`, wired
   into the `/voice` screen (records -> transcribes -> extracts -> follow-up loop
   -> prefilled chips). Spec: `technical/05-onboarding-spec.md`.
3. **(Future) landing-page helper** answering "what is Aura" before sign-in.
   Lower impact, not built now.

### AGENT'S JOB (what the agent helps the user do, 3)
1. **Natural-language plan refinement** (the hero): "more outdoorsy, smaller, a
   different crowd, a different night" re-matches by talking instead of editing
   chips. Tool: `refine_plan`.
2. **Answer questions about Aura**, grounded in a knowledge base (RAG): how
   matching works, what a plan is, privacy.
3. **Onboarding extraction**: turn free text into the structured chip profile,
   asking follow-ups for missing fields.
Supporting tools: `request_new_plan`, `withdraw_current_plan`, `get_current_plan`.

### ACCESS (what the agent can and must access)
- **Knowledge base** (`knowledge/*.md` via in-memory vectors): read-only.
- **The deterministic matching lib** (`generatePlan`, `scorePair`): the agent
  orchestrates it, it never invents matches.
- **The user's own profile + plans** via the existing lib
  (`loadCurrentPlanContext`, `persistPlan`, `declinePlan`): scoped to the
  authenticated user only.
- **OpenAI** for query embeddings, runtime user embeddings, and Whisper
  transcription; **Anthropic Claude** for generation and extraction.
- **Must NOT** touch other users' rows, raw contact details, or write outside
  the signed-in user's data.

### On the exercise title (LLM / MCP / LangChain / Vector)
- **LLM**: Anthropic Claude (`claude-opus-4-8`, env-switchable) via the official
  SDK, behind `lib/aiProvider.ts` so OpenAI can slot in later.
- **Vector**: in-memory RAG over OpenAI `text-embedding-3-small`
  (`lib/ragRetrieve.ts`), the same model the seed pool was embedded with.
- **LangChain**: deliberately not used. We call the Anthropic and OpenAI SDKs
  directly, which keeps a 4-tool agent thin, debuggable, and provider-swappable.
  LangChain would add an abstraction we do not need.
- **MCP**: not in v1. The natural future use is to expose Aura's plan tools
  (refine/request/withdraw) as an MCP server so other agents, including the
  Ex 18 n8n flow, could drive Aura. Noted as a future option.

## Board 2 - AGENT WORKFLOW (the flow)

```
User message  (voice -> Whisper -> text, or text)
  -> embed the query (OpenAI) + retrieve top-k knowledge chunks (cosine, lib/ragRetrieve.ts)
  -> Claude turn: Ora system prompt + retrieved context + tool schemas
  -> if Claude calls a tool (refine_plan / request_new_plan / withdraw / get_current_plan):
        run it against the matching lib (scoped to this user), feed the result back, loop
  -> Claude returns a short grounded reply (+ a plan card when a tool produced one)
```

This is the same Webhook -> AI reasoning -> action shape as Ex 18, but the
action is a typed tool call into Aura's own lib instead of an external webhook.

## Board 3 - RISKS

| Risk | Mitigation (built) |
|---|---|
| Hallucinated answer about Aura | RAG grounding + "answer only from context, else say unsure" + a min-score fallback. Verified: "capital of France" is refused. |
| Agent acts on the wrong user / mutates state it should not | Every tool is scoped to the authenticated requester, never a model-supplied id. |
| Destructive action (withdraw) fired without consent | System prompt requires explicit confirmation; verified Ora confirms before withdrawing. |
| Agent invents matches or names | The deterministic matcher is the source of truth; the agent only orchestrates it. |
| Runtime cost / latency | One query embedding + one Claude turn; the knowledge base is embedded at build time and cached per process. |

---

# Exercise 20 - Context Engineering & Multi-Agent Orchestration

Goal: an efficient AI workflow for a real task using compaction and sub-agents.

## Board 1 - CONTEXT-OPTIMIZED WORKFLOW

### TASK (pick ONE, describe + why it is context-heavy)
**Task: build the Ora agent feature across the codebase** (provider layer, RAG,
the in-app refinement agent + tools + route + UI). This is the "implement a
feature across multiple files" case.
**Why context-heavy:** it spans the matching lib (`match.ts`, `generatePlan.ts`
~280 lines, `plans.ts` ~346 lines), the plan API routes, the onboarding spec,
the AI strategy doc, the types, plus a very large external Anthropic SDK
reference. Loading all of that into one window is expensive and crowds out the
actual work.

Without thinking about AI yet:
- **What is unclear:** how refine / withdraw / current are wired (which lib
  functions, what params), and the exact chip taxonomy the extractor must fill.
- **What to understand first:** the plan API contracts (refine takes
  `activityOverride` + `excludeUserIds`) and the matcher entry point
  (`generatePlan`).
- **Which parts of the codebase are relevant:** `/lib` (match, generatePlan,
  plans, embed, planResponse, userRow), `/app/api/plan/*`, `/types`,
  `technical/04` + `05` + `08`, `product/02`.

### CONTEXT STRATEGY (/compact, at least 2 decisions)
Context-heavy operations recapped from the session:
- Reading the full technical/product docs (AI strategy, future considerations,
  Ora vision, onboarding spec).
- Loading the entire Anthropic SDK reference (very large).
- Reading several `/lib` files and API routes to wire the tools.

`/compact` decisions:
1. **Summarize then drop the exploration.** Once the plan API contracts and
   matcher signatures were extracted, the full file bodies do not need to stay
   in main context. Keep the 5-line summary ("refine = generatePlan +
   persistPlan; withdraw = declinePlan; current = loadCurrentPlanContext"), drop
   the ~1000 lines.
2. **Keep minimal but always present:** the plan doc (`technical/09`), the locked
   decisions (Claude provider, in-memory RAG, refinement hero), and the chip
   taxonomy. These steer every later step, so they stay.
3. **Do NOT let into main context:** the full Anthropic SDK reference and the
   full bodies of subsystems I am not editing. Those go to a sub-agent or get
   summarized, never pasted whole.

### SUB AGENT (read-only context control; screenshot of agent definition)
Built `.claude/agents/aura-context-mapper.md`: a **read-only** (`Read`, `Grep`,
`Glob`) context-gathering agent. It explores ONE subsystem and returns a
fixed-shape map (files that matter, key functions + signatures, data contracts,
gotchas, open questions), so the main agent gets the ~30 lines it needs instead
of reading 1500. It is a context-control mechanism, not an implementer: it
cannot edit, write, or mutate.
**Screenshot = that file.**

## Board 2 - FLOW

```
main session
   |  (about to implement in an unfamiliar subsystem, e.g. "wire refine to the plan API")
   v
aura-context-mapper  (read-only: Glob/Grep to find files, Read only signatures)
   |  returns: files that matter, key signatures (generatePlan options, persistPlan,
   |           declinePlan, loadCurrentPlanContext), contracts (PlanRefinement,
   |           PlanResponse), gotchas (EMBED_ALLOW_RUNTIME, deterministic matcher)
   v
main session  (writes lib/oraTools.ts using those exact functions, summary in
              context instead of the raw files)
```

- **When triggered:** before implementing in a subsystem the main agent has not
  loaded.
- **What it returns:** the structured map above.
- **What the main agent does next:** implements against the summary.
- **Which files change (the MAIN agent, not the sub-agent):** `lib/oraTools.ts`,
  `lib/oraAgent.ts`, `app/api/ora/chat/route.ts`.

## Board 3 - IMPLEMENT & REFLECT

- **Did the sub-agent reduce context usage?** Yes in principle: instead of the
  main context holding `match.ts` + `generatePlan.ts` + `plans.ts` + the routes
  (well over 1000 lines), it holds a ~30-line map. In this session I read some of
  those directly; the sub-agent is the reusable mechanism to avoid that on the
  next phases.
- **What stayed out of main context?** Full file bodies of the matching
  internals and the bulk of the Anthropic SDK reference, once the needed
  signatures were extracted.
- **Would you use a sub-agent here again?** Yes for voice + onboarding (they
  touch `extract.ts`, `transcribe.ts`, the onboarding flow, the chip taxonomy);
  a read-only mapper keeps the implement loop lean. For a single small file, no:
  spawning a sub-agent costs more than just reading it.

---

# Exercise 21 - AI Chatbot Integration (RAG)

Goal: integrate a useful AI chatbot using a naive or RAG approach.

## Board 1 - USECASE (one clear purpose)
Ora answers, inside the app, "how does Aura work and what can I do right now,"
and then acts on it. The exact thing it reliably handles: **how Aura matches me,
what a plan is, whether my data is private, and changing or withdrawing my
plan.** One purpose: help a signed-in user understand Aura and adjust their plan
by talking.

## Board 2 - KNOWLEDGE BASE
Five markdown files in `/knowledge`, one topic each, headings and small
sections, well past 10 knowledge points:
`about-aura.md`, `how-matching-works.md`, `plans.md`, `getting-started.md`,
`privacy-and-safety.md`.
Chunked by H2 section -> 23 chunks -> embedded once at build time
(`npm run build:knowledge`) to `data/knowledge-embeddings.json` (1536 dims).
**Screenshot = `tree knowledge` or the file list.**

## Board 3 - ARCHITECTURE (map each component to our implementation)

| System component | Our implementation |
|---|---|
| Knowledge Source | `/knowledge/*.md` (product facts) embedded to `data/knowledge-embeddings.json` |
| Chat Interface | `components/AskOra.tsx` + `app/ora/page.tsx` (in-app), text now, voice next |
| Backend Logic | `app/api/ora/chat/route.ts` (thin) -> `lib/oraAgent.ts` -> `lib/oraTools.ts` |
| LLM Provider | Anthropic Claude (`claude-opus-4-8`) via `lib/aiProvider.ts`, switchable to OpenAI |
| Retrieval Layer | RAG, in-memory vectors: OpenAI `text-embedding-3-small` + cosine top-k (`lib/ragRetrieve.ts`) |

**Naive vs vectorized (the pro/con):** we chose **vectorized RAG**. Naive
(stuff all docs into the prompt) was viable for a 23-chunk base and simpler to
build, but vectors keep the prompt small, scale as the knowledge grows, and give
a clean relevance score that powers the fallback guardrail. Con: a build step
and an embedding dependency.

## Board 4 - PROMPT DESIGN
From `lib/oraAgent.ts` (`ORA_BASE`):
- **System instruction:** Ora persona; answer ONLY from the knowledge context or
  say you are unsure; use tools for plan actions; map a refinement to a concrete
  activity; confirm before the destructive withdraw; the matcher is the source
  of truth; keep replies short, warm, and free of em dashes.
- **Context:** the top-k retrieved knowledge chunks, injected after the base
  prompt (`buildOraSystem`).
- **User input:** the user's message plus a short history.

Example "say I do not know" rule in action: see the "capital of France" turn in
`19-21-ora-agent-run.txt`.

## Board 5 - GUARDRAILS (3 risks + the guardrails)
Risks: wrong or irrelevant retrieval; hallucinated answers; no context found;
API or network failure.
Guardrails (implemented):
- **No relevant context -> fallback.** `retrieveTopK` applies a `minScore`;
  below it nothing is passed and the prompt says to say-unsure. Verified.
- **Restrict domain / limit scope.** The system instruction answers only about
  Aura, only from context, and never invents features.
- **Validate + scope tool inputs.** The route validates the body (400 on bad
  input); every tool is scoped to the authenticated requester; the destructive
  withdraw needs explicit confirmation.
- **Explicit error handling.** The route wraps async logic in try/catch and
  returns structured errors (project rule).

## Board 6 - IMPLEMENT (working response + reflect)
Minimum requirements all met: user input -> LLM -> response; uses the markdown
knowledge; applies the vector retrieval strategy; implements more than one
guardrail.
**Example chat responses** (full transcript: `19-21-ora-agent-run.txt`):
- "How does Aura decide who to match me with?" -> grounded answer about weighted
  overlap and explainability, no tool.
- "Can you make my plan more outdoorsy?" -> calls `refine_plan`, swaps to hiking.
- "What is the capital of France?" -> refuses (no context).

Reflect:
- **Where did it fail?** Nowhere in the smokes. The live in-app flow is
  auth-gated, so the tools' execution against the real database is verified at
  the logic level (unit tests + smoke), not yet via a live signed-in session.
- **Was it useful?** Yes. Refining by talking beats editing chips, and grounding
  keeps the answers honest.
- **Did the retrieval choice make sense?** Yes. Vectors gave a clean relevance
  score that powers the fallback guardrail; a 23-chunk base could also have run
  naive, but vectors scale.
- **What would break in production?** The runtime OpenAI embedding and Anthropic
  calls need keys in the runtime env (today `OPENAI_API_KEY` is seed-only); cost
  and latency per turn; and `data/knowledge-embeddings.json` must be rebuilt
  when `/knowledge` changes.
