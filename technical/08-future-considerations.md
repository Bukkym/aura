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
