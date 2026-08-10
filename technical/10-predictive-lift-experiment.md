# Predictive-Lift Experiment: does revealed behavior beat stated preference?

The one question that moves the intelligence thesis (see
`/product/02-ora-intelligence-vision.md`) from opinion to evidence:

> Does a signal trained on *revealed* behavior (who actually clicked, who came
> back) predict the next "click" / re-attend meaningfully better than (A) our
> stated-preference match score and (B) a frontier LLM given the same features?

If the lift is large and stable, the convergence loop is a real moat worth its
operational cost. If it is a few points on a noisy target, Aura is a
better-branded events product, still a business, but not a data company. Either
answer is worth knowing early and cheaply.

---

## The blocking reality: we have no ground truth yet

- The DB has 175 seed users + a handful of real ones. No post-meeting vibe, no
  reciprocity, no re-attend data exists. The only outcome columns on `plans` are
  `confirmed_at` / `declined_at`: a requester acting on a *generated* plan, not
  people who met and rated each other.
- `scripts/sim-liquidity.ts` models "vibe" as `scorePair(host, cand)`, i.e. the
  stated-preference score. Training on that and testing lift against `scorePair`
  is circular: the model would predict its own input. **Any lift number produced
  on seed data today is meaningless as proof.**

So the experiment is two distinct things, and only the second one proves
anything:

- **Stage 0 (runnable now):** a harness + power analysis on *synthetic* ground
  truth. Does not prove a moat. Tells us how much real data we need before a moat
  could even be detected, and de-risks the measurement code.
- **Stage 1 (gated on instrumentation + real users):** the actual lift test on
  real revealed outcomes.

---

## Definitions (shared by both stages)

- **Unit:** an ordered pair (A, B) who were in a plan together.
- **Label `clicked(A,B)`:** A's post-meeting signal that A would meet B again
  (pairwise, directional, per future-considerations §4). In Stage 1 this comes
  from real feedback; in Stage 0 it is generated from a synthetic truth function.
- **Baselines to beat:**
  - **A — stated similarity:** `scorePair(A, B)` from `lib/match.ts`. Zero
    behavioral input. This is what the product does today.
  - **B — frontier LLM:** the same two profiles handed to a current frontier
    model, asked to score P(A wants to meet B again), zero-shot. This is the
    "will a general model just do it" control from
    `/product/02-ora-intelligence-vision.md`.
- **Model C — revealed:** a model trained on accumulated pairwise outcomes
  (features: stated overlap + realized history — prior co-attends, prior mutual
  clicks, archetype, availability overlap, group context).
- **Metric:** ROC-AUC and precision@k for "will click" on a held-out set of
  pairs, plus calibration (Brier). Report **lift of C over A** and **lift of C
  over B**, with bootstrap 95% CIs. Split by *user* (never let the same user's
  pairs sit in both train and test) to avoid leakage.

### Pre-registered thresholds (decide before looking)

| Outcome | Reading |
|---|---|
| C beats A **and** B by **>= 0.08 AUC**, CI excludes 0, stable across folds | Real moat. The loop earns its operational cost. Pursue convergence + the data thesis. |
| C beats A by 0.03-0.08 but not clearly B | Weak edge. Good internal recsys, not a sellable model. Build the product; treat AI as retention, not moat. |
| C within 0.03 of A, or B matches C | No moat. You are competing with Timeleft/222 on brand, density, logistics. Drop the data narrative. |

Writing the thresholds down first is the whole point: it stops the result from
being narrated into whatever we hoped for.

---

## Stage 0 — synthetic harness + power analysis (build now)

Purpose: prove the *measurement* works and find the *data volume* needed. Not
the moat.

`scripts/sim-predictive-lift.ts`:

1. **Define a hidden truth.** `trueCompat(A,B)` = a function that deliberately
   *diverges* from stated similarity: e.g. `0.4 * scorePair + 0.4 * f(latent
   traits not in the profile) + 0.2 * noise`. The 0.4 latent term is the
   "revealed" signal a stated-only model structurally cannot see.
2. **Generate noisy observations.** For each simulated plan, emit
   `clicked ~ Bernoulli(sigmoid(k * trueCompat))`, with `k` tuned so single-
   observation accuracy is low (matches future-considerations §3: thin-slice vibe
   is weak).
3. **Fit the three models**, held-out by user, sweeping the number of observed
   pairs `M in {200, 1k, 5k, 20k, 100k}`.
4. **Report the power curve:** at each `M`, the lift of C over A and the CI
   width. This yields the headline number we actually need now: *"you need ~X
   real labeled pairs before a moat of size Y is detectable."* Given the low-
   signal target, expect X to be large. That estimate is itself a strategic input
   (it tells you how many user-months of real plans you must run first).

Run: `npm run sim:predictive-lift`. Reuses `scorePair`, `userFromRow`,
`buildArchetypeProfiles`, the same plumbing as `sim-liquidity.ts`.

**Honest limit:** Stage 0 can only show the harness has power and how much data
is needed. If the *real* world has no latent-beyond-stated signal (i.e. the true
0.4 term is really ~0 in humans), no amount of data helps, and only Stage 1 can
reveal that.

**Illustrative first run** (`npm run sim:predictive-lift`, 10 seeds, ~30
observations per plan):

| wL (behavior-only signal) | data gate to detect a moat | lift at ~667 plans |
|---|---|---|
| 0.10 (low, the §3 world) | ~20k pairs (~667 plans), and even then | ~0.008 AUC — detectable but commercially trivial |
| 0.25 (moderate) | ~5k pairs (~167 plans) | ~0.09 AUC — real |
| 0.40 (high) | ~5k pairs (~167 plans) | ~0.17 AUC — large |

Read it as: unless who-clicks is *meaningfully* predictable beyond stated
preferences (wL around 0.25+), the moat is either undetectable or too small to
sell, and even in the optimistic case you need on the order of 150-700 rated
plans before Stage 1 can measure anything. That number is the real cost of the
intelligence bet and a direct input to the city-density and fundraising plan.

---

## Stage 1 — the real test (gated on instrumentation)

Cannot start until real users generate outcomes. Prerequisites:

1. **Instrument pairwise vibe.** After a plan, capture per-other-attendee:
   would-meet-again (the click), and separately group-energy + would-return
   (per `/product/02-ora-intelligence-vision.md` "quality over volume"). New
   table `plan_feedback(plan_id, rater_id, ratee_id, would_meet_again bool,
   created_at)`; directional, one row per (rater, ratee).
2. **Instrument re-attend / convergence** (already implied by the cohort work in
   future-considerations §4): whether a pair co-attended again, whether a stable
   core formed.
3. **Log refinement corrections** as stated-vs-revealed rows ("more outdoorsy"
   after seeing matches), per the vision doc.

Then run the exact Stage 0 harness on real labels, with baseline B (frontier
LLM) as the control that decides whether the signal is *proprietary* or just
*obvious*. Pre-registered thresholds above apply unchanged.

**Data-volume gate:** do not bother running Stage 1 for real until you have at
least the `M` Stage 0's power curve says is needed (likely thousands of labeled
pairs = many hundreds of real users cycling through several plans). Running it
underpowered just produces a noisy null and a false "no moat" read.

---

## Why this is the right sequence

- Stage 0 is cheap, runnable this week, and its power curve tells you the real
  cost of the whole intelligence bet (how many real plans before you could even
  know). That number should inform fundraising and city-density targets more
  than any deck slide.
- Stage 1 is the only thing that proves or kills the moat, and it is gated on the
  same liquidity/instrumentation work the product needs anyway. The experiment
  and the product build the same infrastructure.
- Baseline B (frontier LLM) is non-negotiable. Beating A (your own stated score)
  proves behavior adds signal; only beating B proves that signal is something a
  general model can't already infer. The vision doc's entire claim lives or dies
  on the C-vs-B gap.

## Change Log

- 2026-08-05: Experiment spec created. Staged design (synthetic power analysis
  now, real lift test gated on instrumentation), pre-registered thresholds,
  frontier-LLM control. Prompted by the "can this beat foundation models"
  question. Records the blocking fact that no real behavioral ground truth exists
  yet and that `sim-liquidity`'s vibe proxy is circular.
