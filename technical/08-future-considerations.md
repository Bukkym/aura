# Future Considerations

A running log of ideas and product notes to revisit later. Not committed work,
not a spec. Captured from feedback sessions.

First entry: 2026-06-18 (feedback session).

---

## 1. WhatsApp: anonymous numbers

**Idea:** when Ora connects a group over WhatsApp, members should not see each
other's real phone numbers. Connect them through an anonymous / proxy line
(masked numbers, like the relay Uber and delivery apps use), so the introduction
happens without exposing personal numbers.

**Done now:** the WhatsApp CTA on the accepted-plan view
([live-plan.tsx](../components/aura/screens/live-plan.tsx), `AcceptedView`) now
carries the reassurance copy: "Your number stays private. Ora connects the group
through an anonymous line, so no one sees anyone else's real number." This sets
the expectation even though the relay itself is not built yet.

**Open: where do we collect WhatsApp numbers?** Today the app collects no phone
number anywhere (onboarding captures chips; auth captures email only). The
"Open WhatsApp" handoff is currently a copy/paste invite, not a real connection.
For the anonymous-line vision we will need to decide:
- When to collect the number: at onboarding, or just-in-time when a user joins
  their first plan (lower-friction, asked only once it matters).
- Storage + privacy: store the real number server-side only, never expose it to
  other members; mint a proxy/relay number per group via a provider (e.g.
  Twilio/MessageBird WhatsApp Business API masked numbers) or a WhatsApp group
  Ora administers.
- Consent + verification: verify ownership of the number, explicit opt-in to be
  contacted, and a way to leave.

---

## 2. AI agents that simulate using the app

**Idea:** run AI agents as simulated users that go through the app (onboarding,
receiving plans, accepting/declining, requesting another), so we can generate
feedback and behavioral signal at scale, and use it to train / iterate on the
matching and the experience without waiting on slow human cycles.

**Why it could fit here:** the matching engine is deterministic and the flows
are well-defined, so synthetic users could exercise edge cases (sparse pools,
odd chip combinations, decline-then-refine loops) and surface where plans feel
off, faster than recruiting testers.

**Open questions:**
- What signal do we actually trust from a simulated user vs. a real one?
- Where would simulated feedback feed in: tuning match weights, generating test
  fixtures, pre-screening copy, or a reinforcement-style loop?
- How do we avoid the model just confirming its own priors?

**Backing for this method (LLM synthetic users):** _Promising but unproven._
There is a real, fast-growing (2022 to 2025) peer-reviewed literature on LLM
agents as "synthetic users," but the consensus is they complement rather than
replace real-user research.

- **Foundational:** Argyle et al., "Out of One, Many: Using Language Models to
  Simulate Human Samples" (Political Analysis, 2023) introduced "silicon
  sampling" and *algorithmic fidelity*: conditioned LLMs can emulate
  sub-population response distributions. https://arxiv.org/abs/2209.06899
- **Behavioral simulation:** Park et al. (Stanford/Google DeepMind), "Generative
  Agents: Interactive Simulacra of Human Behavior" (UIST 2023),
  https://arxiv.org/abs/2304.03442 ; follow-up "Generative Agent Simulations of
  1,000 People" (2024) built agents from 2-hour interviews that reproduced
  people's survey answers ~85% as well as the people themselves two weeks later.
- **UX-specific:** Lu et al., "UXAgent: An LLM Agent-Based Usability Testing
  Framework for Web Design" (CHI 2025), generates thousands of simulated users
  to pilot a study before human testing. https://arxiv.org/pdf/2502.12561
- **Known fidelity gaps (the caveats that matter for us):** simulated users show
  drastically reduced variance (an "average persona" effect), a positivity bias
  (too-agreeable feedback that flatters features real users disliked), and overly
  clean task paths where real users wander, backtrack, and give up. Cultural/
  English bias and weak persona persistence are also documented. Surveys: "LLM-
  based Human Simulations Have Not Yet Been Reliable"
  (https://arxiv.org/html/2501.08579v2); "Take caution in using LLMs as human
  surrogates" (https://pmc.ncbi.nlm.nih.gov/articles/PMC12184514/).
- **Industry:** SyntheticUsers.com, Delve AI, Uxia sell AI "participants";
  independent tests (MeasuringU, Userbrain) find useful first-pass signal but
  warn it flatters.

**Takeaway for Aura:** good fit for *exploration* (exercising edge cases,
pre-screening copy, generating test fixtures, piloting a flow before humans),
not for *proof*. Use simulated feedback to find where plans feel off faster, then
validate the real signal with humans. Watch the positivity bias hard, since an
agreeable agent would happily rubber-stamp a bad match.

---

## 3. Scientific grounding for the friendship-formation concept

**The concept to ground:** Aura's core loop is a friendship-formation engine.
Match compatible strangers, have them meet in a small group around a shared
activity in their city, collect "vibe" feedback after, re-match on that signal,
and repeat so friendships form over repeated meetings. The question: is this loop
backed by science (conditions for friendship, dosage of contact, shared
activities, similarity matching, post-meeting affect as signal), beyond what
earlier product versions showed?

**Scientific backing:** _Moderately to well grounded._ The pillars that map onto
the most robust findings are repeated meetings, small groups, and shared activity
plus structured disclosure. The matching algorithm and single-meeting vibe scores
are the least supported and should be treated as soft, aggregated signals.

Building blocks, each with a support rating and the key caveat:

1. **Proximity / repeated interaction / mere exposure — WELL SUPPORTED.**
   Festinger, Schachter & Back's Westgate study (1950): ~65% of friendships
   formed among near-neighbors, falling sharply with distance. Zajonc's mere-
   exposure effect (1968): repeated exposure raises liking. The repeat-meeting
   loop is essentially engineered propinquity, the right lever. _Caveat:_
   proximity is a proxy for repeated low-friction contact; more info can reduce
   liking when early dissimilarity surfaces.
2. **Time / dosage — WELL SUPPORTED (directional).** Hall (2019): ~40-60 hrs to
   casual friend, ~80-100 to friend, 200+ to close, and the hours must be leisure
   / hanging out, not co-presence. Validates cadence over any one-shot event.
   _Caveat:_ retrospective self-report, small sample, so treat numbers as
   directional.
3. **Shared activities / third places — MODERATELY SUPPORTED.** Hall identifies
   shared activity + everyday talk as how time works; Oldenburg's "third place"
   is influential but largely theoretical. _Caveat:_ Oldenburg centers
   conversation, so the strongest design is a light activity with room to talk.
4. **Similarity vs complementarity — MIXED (weakest for the matcher).** Byrne's
   similarity-attraction holds in the lab, but in the field *perceived* (not
   actual) similarity predicts attraction, and many trait similarities do not
   predict friendship. _Implication:_ weight profile-similarity matching lightly
   and do not over-promise; real similarity emerges during the meeting, which the
   app cannot pre-compute.
5. **Accelerated closeness (Aron's 36 questions) — SUPPORTED, sharp caveat.**
   Escalating reciprocal self-disclosure builds closeness in ~45 min. But the
   same study found pre-matching on attitudes or priming mutual liking added
   *nothing*. _Implication:_ structured disclosure prompts in meetings are
   justified; over-engineered compatibility matching is not.
6. **Small-group size — MODERATELY SUPPORTED.** Converging (mostly
   observational) evidence favors ~3-5 for conversation, ~4-6 for relationship
   diversity. The small-group choice is well aligned.
7. **Vibe / thin-slice feedback — PARTIALLY SUPPORTED (weakest signal).** Ambady
   & Rosenthal: thin slices predict some outcomes; rapport judgments barely
   improve with more time. So a quick post-meeting rating carries real signal.
   _Caveat:_ thin-slice accuracy is bias-prone and predicts the rater's own
   impression more than the other person's lasting interest. Treat vibe as a
   noisy directional input, aggregated across meetings, not ground truth.
8. **Loneliness context / structured matching — CONTEXT SUPPORTED, OUTCOME
   EVIDENCE WEAK.** The "friendship recession" is well documented, but evidence
   that structured matching / social prescribing / speed-friending produces
   *durable* friendships is thin (no RCTs, no controls in the leading review).
   _Implication:_ strong rationale, little rigorous outcome evidence, so
   instrumenting our own outcomes is both a scientific and competitive edge.

**Design implications for Aura:** lean hard on cadence and repeated low-pressure
contact (best-supported); keep groups small; pair a light shared activity with
room for structured disclosure; keep the matching algorithm humble and the vibe
score as one soft input among many, re-matching on accumulated behavior rather
than a single thin-slice rating; and measure real outcomes since the category
lacks causal evidence.

**Sources:**
- Festinger, Schachter & Back, Westgate study (1950), propinquity — https://faculty.wcas.northwestern.edu/eli-finkel/documents/InPress_FinkelNortonReisArielyCaprarielloEastwickFrostManiaci_PPS.pdf
- Zajonc, mere-exposure effect (1968) — https://www.simplypsychology.org/mere-exposure-effect.html
- Hall (2019), "How many hours does it take to make a friend?", J. Social & Personal Relationships — https://journals.sagepub.com/doi/full/10.1177/0265407518761225
- Oldenburg, third-place theory — https://www.pps.org/article/what-is-a-third-place-beyond-the-buzzword-to-true-social-connection
- Byrne, similarity-attraction — https://www.encyclopedia.com/social-sciences/applied-and-social-sciences-magazines/similarityattraction-theory ; Tidwell, Eastwick & Finkel, perceived vs actual similarity — https://faculty.wcas.northwestern.edu/eli-finkel/documents/InPress_TidwellEastwickFinkel_PersonalRelationships.pdf
- Aron et al. (1997), Experimental Generation of Interpersonal Closeness, PSPB — https://journals.sagepub.com/doi/10.1177/0146167297234003
- Optimal group size, evidence brief — https://www.socialconnectionguidelines.org/en/evidence-briefs/what-is-the-ideal-size-of-a-get-together
- Ambady & Rosenthal, thin-slice meta-analysis — https://www.semanticscholar.org/paper/Thin-slices-of-expressive-behavior-as-predictors-of-Ambady-Rosenthal/df0c9ca7be20ee0b7c5436332c20dcf46b2109d7
- Social prescribing systematic review (no RCTs/controls) — https://pmc.ncbi.nlm.nih.gov/articles/PMC8295963/

---

## 4. Repeated meetings: dual-track friendship formation (decided 2026-06-18)

**Decision: dual-track.** A friendship track (convergent) plus a spontaneous
lane (divergent), rather than one engine doing both (which reads as mechanical)
or a pure replace-only friendship engine (too rigid). The "request another" /
refine / decline / keep-multiple flow we shipped IS the spontaneous lane; it just
needs relabeling and to be excluded from friendship-track state.

**Two layers people conflate:**
- **Cluster / archetype** = the compatibility *pool* (who you could meet). Both
  lanes draw from it.
- **Cohort** = the converging *friendship group* within the pool. Repeated
  meetings live here, not in the cluster.

**Friendship-track mechanics (from the prior app, research-aligned):** the cohort
is NOT predefined. Start from the cluster; each plan draws overlapping members;
pairwise vibe feedback (thumbs up/down post-meeting) keeps/prioritizes the
up-voted and drops the down-voted; vacated seats top up with fresh cluster
members; by ~plan 5 the group stabilizes. Maps onto the research: humble matching
up front, vibe as a soft *aggregated* signal refining over time, cadence building
Hall's dosage.

**Reshuffle consequences:**
- Managed turnover is the sweet spot. Too much reshuffle = never accumulate hours
  with anyone (serial blind dates, no friendship); too little = stuck with a bad
  match that poisons the group. Keep up-voted, drop down-voted, refill only
  vacated seats.
- Vibe state is **pairwise** (A down-voting B removes the pair even if B liked A),
  not per-person.
- Data-model shift: from "plan = fresh match" to "cohort = evolving member set +
  pairwise vibe state + journey position (plan N of 5)."
- **Liquidity is make-or-break:** convergence assumes the same compatible people
  are *available* plan after plan. Validate this before building the algorithm.

**Liquidity reality (measured 2026-06-18):** 177 users in the DB, but only **2
real** (auth-linked); 175 are seed across the 7 archetypes (25 each). Real users
have **no archetype assigned** (clustering isn't wired into chip onboarding). So
real liquidity is unmeasurable now; the binding constraint is users-per-cluster-
per-city, not the convergence logic.

**Plan (validate liquidity first):**
1. Wire **cluster/archetype assignment for real users** (prereq for both lanes;
   today only seed users have it).
2. Run a **convergence simulation over the seed clusters** to derive the
   liquidity *threshold*: the minimum active, availability-overlapping users per
   cluster per city needed to keep a ~5-person cohort overlapping across ~5
   plans under managed turnover. That number becomes an acquisition target and
   the metric to instrument once real users arrive.
3. Defer the cohort + pairwise-feedback + convergence build until a real pool
   approaches that threshold.

**Liquidity simulation results (seed pool, 2026-06-18, `npm run sim:liquidity`):**
Simulated a 5-plan journey per host with managed turnover (keep who you click
with, drop a churn fraction, refill from the cluster who share availability),
sweeping the available cluster size N. Findings:
- At **low churn (20%, drop 1 of 5 per round):** need **~20-25 availability-
  overlapping candidates per cluster** to keep the cohort filled across 5 plans
  and form a **stable core of ~3**. Below ~12, seats can't be filled (liquidity
  collapse). Threshold (filled >=80%, core >=3) is reached only at N=25.
- At **higher churn (40%):** even N=25 doesn't cleanly converge (core ~2.4).
  Feedback quality matters enormously: lots of down-votes => need a much bigger
  pool, or it never gels.
- **Availability is the silent constraint:** the overlap filter cuts the usable
  pool below the raw cluster size, so even 25 tops out around 83% filled.
- **Realistic convergence is a core of ~3** plus rotating others (you meet ~7-8
  distinct people across the journey), not a fixed group of 5.

**Implication / target:** aim for **~20-25 active, availability-overlapping users
per cluster per city** before the friendship track works, and keep churn low via
good initial matching. With 7 clusters that's ~150+ active users per city as a
floor just to make single-cohort journeys viable. Caveat: seed availability is
synthetic and vibe is modeled as match score, so real-world numbers are likely
*worse* (sparser availability, noisier vibe = effective higher churn). This
strongly supports holding the convergence build until acquisition reaches that
density, and instrumenting cohort-overlap retention once real users arrive.

---

## 5. Cancel / leave a plan (from feedback session 2026-06-19) — ✅ SHIPPED 2026-06-24 (see §8)

**Feedback:** there should be a way to cancel a plan, or for a member to leave a
plan if they can no longer make it.

**Why this is bigger than a UI button:** the current model is **host-only**. A
host creates a plan, attendees are deterministically assigned into the plan's
`attendee_user_ids` array (no per-member membership record), and only the host
can act on the plan via `confirmed_at` / `declined_at`. There is no concept of
an attendee accepting, joining, or leaving. So the feedback splits into two
features:

- **Host cancel (small).** The capability mostly exists: `declinePlan()` in
  [lib/plans.ts](../lib/plans.ts) sets `declined_at`, and
  [app/api/plan/decline/route.ts](../app/api/plan/decline/route.ts) exposes it.
  What is missing is surfacing it as an explicit "Cancel plan" action in the UI
  (today decline is framed as "Not now" on the forming/ready beat, not as
  cancelling a confirmed plan). Also decide what cancel means for a *confirmed*
  plan vs. an un-acted one, and whether attendees get notified.

- **Attendee leave (real work).** Does not exist at any layer. Needs:
  - A new API route (e.g. `POST /api/plan/leave`) plus a `lib` function.
  - A way to remove a user from `attendee_user_ids` (array mutation) and an RLS
    policy that lets an attendee modify only their own membership, not the host's
    plan. The current RLS only lets the host touch the row.
  - A product decision on cohort impact: does leaving trigger a **backfill** from
    the cluster (ties into the liquidity work in section 4), drop the seat, or
    re-form the group? And how/whether the rest of the group is told.
  - Possibly migrating membership from the `attendee_user_ids` array to a proper
    join table if per-member state (joined / left / can't-make-it) becomes real.

**Scope:** ship host-cancel surfacing first (small, self-contained). Treat
attendee-leave as its own piece, designed alongside the dual-track / backfill
work, not as a quick add.

---

## 6. Real plan addresses, not just neighborhoods (from feedback session 2026-06-19) — ✅ SHIPPED 2026-06-24 (see §8)

**Feedback:** plans show a vague location like "Berlin, Kreuzberg" instead of an
actual address of the venue. Worth a real street address. (Could be sourced via
LLM or a places API later, but preseeded addresses on the existing venues would
already cover the seed pool.)

**Current state:** there is no address anywhere in the stack. The `places` table
([supabase migration init_schema.sql](../supabase/migrations/20260513105207_init_schema.sql))
has only a `neighborhood` column; the same is true of the `Place` type in
[types/index.ts](../types/index.ts), the seed file
[data/places.json](../data/places.json) (33 venues), and the `PlanResponse`
shape in [lib/planResponse.ts](../lib/planResponse.ts). The UI renders
`{plan.place.name} · {plan.place.neighborhood}` in
[live-plan.tsx](../components/aura/screens/live-plan.tsx).

**Cleanest near-term version (no LLM / no external API yet):** add an `address`
field and fill in the 33 seed venues by hand. This touches five layers:
1. Migration: add `address text` (nullable, or not-null with a backfill) to
   `places`.
2. Seed: add an `address` to each entry in `data/places.json` and re-run the
   migrate script.
3. Type: add `address` to `Place` in `types/index.ts`.
4. API: include `address` in `PlanResponse`.
5. UI: show the street address on the plan / accepted views (and consider a
   maps link).

**Later:** for venues we don't preseed (LLM-generated or user-suggested places),
resolve the address via a places API (Google Places, Mapbox) at plan-generation
time and cache it on the `places` row.

---

## 7. BUG: signed-in user is sent back to onboarding (from feedback session 2026-06-19) — ✅ FIXED 2026-06-24 (see §8)

**Observed:** after signing in, the app drops the user back into the onboarding
flow instead of their signed-in home. Not expected behavior. Logged for the next
session, not fixed yet.

**Root cause (identified, not fixed):** in [app/page.tsx](../app/page.tsx) the
only "returning user" signal is **whether the user already has a plan**:

```
hasPlans = (await listPlanSummaries(sb, user.id)).length > 0
if (hasPlans) redirect("/home")
return <OnboardingFlow />   // signed-in but no plans -> onboarding again
```

So a signed-in user with **zero plans** is re-shown onboarding, even though they
already completed it. This happens whenever a user has onboarded but has no live
plan: their only plan was declined/expired, a plan was never generated, or the
`listPlanSummaries` lookup throws (the catch falls through to onboarding by
design).

**Fix direction (for next time):** gate the onboarding-vs-home decision on
**onboarding completion / profile existence**, not on plan count. Options:
- Check for a persisted profile (e.g. a `users` row with `display_name` /
  chip-derived profile) and route completed users to `/home` regardless of plan
  count; only un-onboarded signed-in users should see `OnboardingFlow`.
- Distinguish "no profile yet" from "profile but no active plan" so the second
  case lands on `/home` (which can show the forming/empty state) rather than
  restarting onboarding.
- Revisit the `catch` fallthrough so a transient lookup failure doesn't bounce a
  real user into onboarding.

**Start here next session.** ✅ Fixed 2026-06-24 (see §8).

---

## 8. Status & next steps (updated 2026-06-24)

The clarified product model and the post-launch backlog. Start here in a new
session. Companion notes live in agent memory ([[plan-model-pool-based]],
[[feedback-batch-next-steps]]) but this doc is the canonical, in-repo record.

### Product model (locked)

Aura is **pool-based**. Everyone who enters does so by making a **request** (their
activity intent + availability + who they want to meet, captured at onboarding).
The **system** turns requests into **plans**. There is **no "host"**: the person a
plan is generated for is the **requester** (universal role, everyone is one), and
everyone in a plan is an **attendee**. Vocabulary is locked in code as of the
rename below: `requester` (role) + `created_for_user_id` (plan column) +
`attendee` (everyone in a plan).

### Shipped to production (2026-06-24)

- **§7 onboarding bounce-back bug** — routed returning users on profile
  existence, not plan count (`profileExists` in lib/plans.ts). PR #47.
- **§5 cancel/withdraw** — "Cancel this Plan" on the accepted view →
  `declineLivePlan`. Under the pool model this IS "leave" for a requester. PR #48.
- **§6 real plan addresses** — `places.address` + migration backfilling the 33
  seed venues; shown on the plan/accepted views + WhatsApp invite. PR #49.
- **Seed pool as active requesters** — `scripts/seed-requests.ts` gave all 175
  seed users an active plan request, so a fresh real user matches against a
  populated pool. PR #50.
- **host → requester/created_for rename** — removed the "host" concept across
  DB/code/API; migration renamed `host_user_id` → `created_for_user_id`. PR #51.

### Open / next (not built; pick these up next)

1. **Shared-plan pool model (the cohort milestone) — the big one.** Today each
   requester gets their *own* plan row and `attendee_user_ids` are matched
   references (mostly seed users), not real people who joined; there is no logic
   to add a new requester to an existing plan. Target: when a request comes in,
   the system either slots the requester into an existing upcoming plan that fits
   (activity + availability + compatibility + capacity) or creates a new one and
   invites others, so a single plan holds multiple real requesters who each
   joined. Likely needs a `plan_members` join table with per-member state
   (joined / left / declined), with `created_for_user_id` meaning "who this plan
   was originated for" while membership holds all participants. **Gate:** liquidity
   (§4 sim: ~20-25 active availability-overlapping users per cluster per city,
   ~150+ active/city) before convergence works. Hold the build until acquisition
   approaches that.
2. **Real attendee-leave** — depends on (1). A participant leaving a *shared*
   plan: safe `leave_plan` SECURITY DEFINER RPC removing only the caller from a
   plan they're in, per-member membership state, and an attendee-facing plan view
   (none exists today). Until (1) lands, "leave" = withdraw your own request =
   the cancel/decline already shipped (§5).
3. **Synthetic-users testing (§2)** — turn the now-active seed requesters into
   agents that also accept/decline/refine, to exercise matching and generate
   behavioral signal. Natural next initiative now that the pool is populated.
4. **Spontaneous lane (timing urgency)** — factor in *how soon* someone wants to
   meet (tomorrow vs. in two weeks), vs. today's friendship mode that matches on
   general availability to the next fitting plan. Pairs with the dual-track
   design (§4). Future.
5. **Skippable activity-request / onboarding split** — let a user finish
   personality onboarding but skip the activity request; they land on an empty
   home and request their first plan when ready (today onboarding flows straight
   into a generated plan).
6. **Seed display-name polish (launch believability, low effort)** — some seed
   users have auto-generated names (e.g. "Sojen30353") that read as fake; clean
   them up so a matched group feels real to early users.

### Still-deferred from earlier sections

- **§1 WhatsApp anonymous-number relay** — reassurance copy shipped; the relay
  + where-to-collect-numbers is unbuilt.
- **§4 dual-track convergence build** (cohort + pairwise vibe + backfill) —
  deferred behind the same liquidity gate as open item (1).
