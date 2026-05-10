# Data Model — Bootcamp MVP

The shape of users, places, matches, and the fields that flow between them. Aligned with the locked decisions in `01-mvp-decisions.md`.

Date: 2026-05-07

---

## Two-layer profile model

Every user has three layers, each derived from the previous:

1. **Raw inputs** — what the user actually said (Whisper transcripts + typed fields)
2. **Extracted attributes** — structured tags produced by the LLM extraction pass
3. **Embeddings** — numeric vectors for similarity search

The structured layer is what powers explainability. The embedding layer is what powers ranking. We keep both because:
- Embeddings rank well but cannot explain themselves.
- Structured tags explain well but match too rigidly on their own.

Together: embeddings rank, structured tags explain.

---

## User schema

```ts
type User = {
  userId: string                    // uuid, present from day one even though no auth
  displayName: string
  city: "Berlin"
  ageRange?: { min: number; max: number }
  createdAt: string                 // ISO timestamp

  // Layer 1: raw inputs (preserved for re-extraction during refinement)
  rawInputs: {
    selfDescription: string         // voice → Whisper → text
    lookingFor: string              // voice → Whisper → text
  }

  // Layer 2: structured extraction — "who I am"
  selfExtracted: {
    personality: string[]           // e.g. ["chill", "ambitious", "introverted"]
    interests: string[]             // topical: ["startups", "philosophy", "techno"]
    activityTypes: string[]         // concrete activities: ["boulder gym", "dinner parties", "gallery openings"]
    socialPreferences: string[]     // e.g. ["small-group", "low-pressure"]
    lifeContext: string[]           // e.g. ["new to Berlin", "remote worker", "expat"]
    vibeKeywords: string[]          // catch-all for things that did not slot cleanly
    availability?: string[]         // optional: ["weekends", "weekday evenings"]
    budget?: "low" | "mid" | "high" | "any"  // optional, sensible default = "any"
  }

  // Layer 2: structured extraction — "who I want to meet"
  lookingForExtracted: {
    personality: string[]
    interests: string[]
    socialPreferences: string[]
    vibeKeywords: string[]
    connectionType: ConnectionType[]   // what kind of relationship is sought
  }

  // Layer 3: derived embeddings (regenerated whenever the structured layer changes)
  selfEmbedding: number[]           // embed(stringify(selfExtracted))
  lookingForEmbedding: number[]     // embed(stringify(lookingForExtracted))
}
```

Where:

```ts
type ConnectionType =
  | "close-friendships"      // ride-or-die, deep, few-and-deep
  | "social-circle"          // a broader friend group, regular hangouts
  | "activity-buddies"       // people to do specific things with, no deep bond required
  | "new-city-support"       // help orienting, integrating, building first ties in a new city
```

Multi-value because real users often want a mix (e.g. "close friendships AND activity buddies"). Captured only on `lookingForExtracted` — what someone is *offering* relationally is implicit in their personality + life context, no separate `selfExtracted` field needed.

Notes:

- **Tag canonicalization is part of extraction (not deferred).** During the LLM extraction pass, free-form text is mapped to a canonical tag set per category. The user's spoken word "entrepreneurial" becomes the canonical tag `ambitious`; "into Berghain" becomes `techno` + `clubbing`. This makes structured-tag overlap (used for explanations) clean and reliable, while embeddings still carry the bulk of the semantic load for ranking. The canonical tag set starts small and grows organically as new tags are seen.
- **Editable chips bind to `selfExtracted` / `lookingForExtracted`.** When the user edits a chip in the UI, that field updates and embeddings regenerate. Raw input is preserved untouched.
- **Refinement (`"more social"`) replays the full extraction pipeline** with the original raw input plus the refinement instruction. The output overwrites the structured layer; embeddings regenerate.

---

## Matching algorithm

Mutual fit, not one-sided affinity. A is a match for B only if A wants someone like B *and* B wants someone like A.

```
score(A, B) = 0.5 * cosine(A.lookingForEmbedding, B.selfEmbedding)
            + 0.5 * cosine(B.lookingForEmbedding, A.selfEmbedding)
```

- For a query user Q, rank all other users by `score(Q, user)` and return top-K (likely K = 5–10 for the MVP results list).
- The 50/50 weighting can be tuned later. Asymmetric weighting (e.g. 0.6 / 0.4) is one knob to expose if results feel off.

---

## Explanation generation

Each match shows "why this match" tags. Two sources, in order of preference:

1. **Deterministic overlap** between structured layers. Cheap, fast, transparent. Examples:
   - `Q.lookingForExtracted.interests ∩ B.selfExtracted.interests` → "Both into {startups, techno}"
   - `Q.lookingForExtracted.personality ⊂ B.selfExtracted.personality` → "B is the chill, ambitious type you described"
   - `Q.selfExtracted.lifeContext ∩ B.selfExtracted.lifeContext` → "Both new to Berlin"
   - `Q.lookingForExtracted.socialPreferences ∩ B.selfExtracted.socialPreferences` → "Matches your low-pressure social style"

2. **Optional one-line LLM summary** for the top result(s). Pass both extracted profiles, ask for one sentence. Adds warmth where deterministic overlap reads stiff. Can be added late — not blocking.

Overlap is computed on free-form strings, so add lightweight normalization before set intersection: lowercase, trim, basic stem if needed. Synonym handling is pushed to embeddings.

---

## Place / event schema

```ts
type Place = {
  id: string
  name: string
  type: "cafe" | "bar" | "club" | "gallery" | "park" | "gym" | "venue" | "other"
  neighborhood: string              // "Kreuzberg", "Mitte", etc.
  activityTypeTags: string[]        // ["boulder gym", "dinner spot", "gallery"]
  vibeTags: string[]                // ["low-key", "creative crowd", "after-work"]
  description: string               // 2–3 sentence vibe writeup, hand-curated
  embedding: number[]               // embed(description + tags joined)
}
```

For MVP: 30–50 hand-curated Berlin venues. Stored in a single JSON file or sqlite table; embeddings precomputed on load.

Note: events as a separate type are out of MVP scope — Plans (see below) carry their own dateTime. Place is the venue layer; Plan is the activity-at-venue-at-time layer.

---

## Plan schema

The product's central unit. A Plan is *the thing the user shows up to* — an activity at a venue at a time, with the specific people picked for it. Per the product vision: "AI decides the what, where, and when. User just shows up."

```ts
type Plan = {
  planId: string
  hostUserId: string                // the user this Plan was generated for
  activityType: string              // "boulder gym session", "dinner party", "gallery hop"
  place: Place
  dateTime: string                  // ISO timestamp
  vibe: string[]                    // ["chill", "low-pressure"]
  attendees: User[]                 // ~6-8 users incl. the host, picked for fit
  whyThisPlan: string               // LLM one-liner: why this plan, why these people
}
```

### Plan generation logic

After chips are confirmed, the system runs this chained pipeline:

1. **Pick activity type** — high-affinity choice from the host's `activityTypes`. If multiple candidates, prefer one with strong venue+attendee coverage (i.e. don't suggest scuba diving if only one venue and three matching users exist).
2. **Pick venue** — RAG-lite cosine over `Place.embedding`, filtered by `activityTypeTags ∋ chosen activity type`. Return top-1 (or top-3 to surface as alternatives).
3. **Pick time** — derived from activity-type norms (gallery openings = evenings, hikes = weekend mornings, dinners = Friday/Saturday eve) crossed with host's `availability` if specified.
4. **Pick attendees (~6-8)** — run the existing mutual-fit cosine match algorithm (see *Matching algorithm* below) against the host's pool, but with two constraints:
   - Candidate must have the chosen `activityType` in their `selfExtracted.activityTypes` (or a close embedding-neighbor).
   - Optimize the *group* not just per-pair fit — ideally each person has 2-3 strong mutual matches inside the group, not "everyone matches the host but nobody else."
5. **Generate `whyThisPlan`** — single LLM call given activity, venue, time, attendees' attributes, and host's preferences. Output: 1-2 sentence warm explanation in Ora's voice.

### MVP Plan generation simplifications

For the bootcamp MVP, ship the lightweight version of step 4: rank candidates by mutual-fit score, take the top 6-8 who also have the activity type. Don't optimize for group-internal cohesion yet — flag it as a Phase 2 improvement.

The "Why these six?" debug panel (visible in dev mode for demo purposes) shows the broader matchable pool ranked, so portfolio reviewers can see the matching working at scale even though the user only sees the picked Plan.

---

## Mock user generation strategy

Full archetype definitions, mock data mix, and rationale live in `03-archetypes.md`. Summary here:

- 7 archetypes (Ambitious Creators, Cultural Explorers, Scene & Nightlife, Outdoor & Active, Wellness & Inner-Work, Cozy Connectors, Sports & Crew) — defined as *social modes*, not interest sets.
- ~175 users total, ~25 per archetype.
- Each generated user gets full `rawInputs` (synthesized as if spoken naturally) + pre-extracted `selfExtracted` / `lookingForExtracted` to skip extraction during seeding.
- Mix strategy: 80% intra-archetype lookingFor, 15% adjacent-archetype bridges, 5% deliberate mismatches.
- Diversity axes: age, Berlin tenure, introvert/extrovert split, specificity of `lookingFor`, spread across `activityTypes` so every plausible Plan can be filled.
- Embeddings precomputed at seed time. Single `users.json` (or sqlite) file.

Archetypes are a generation tool for the bootcamp MVP and a hard cluster-pool for the real product (per PROJECT.md). The MVP matching algorithm is archetype-blind — see `03-archetypes.md` for why.

---

## Match record (internal, not surfaced as a top-level result)

Match is now an *internal artifact* used during Plan attendee selection, not the user-facing payoff. Users never see a "matches list" — they see a Plan with the picked attendees. Match records still exist because the matching algorithm still runs; they just live one layer down.

```ts
type Match = {
  queryUserId: string
  matchedUserId: string
  score: number
  explanations: {
    sharedInterests: string[]
    sharedActivityTypes: string[]
    sharedSocialPreferences: string[]
    sharedLifeContext: string[]
    matchedPersonalityTraits: string[]   // from queryUser.lookingFor → matchedUser.self
    summary?: string                     // optional LLM one-liner
  }
}
```

Computed per request. Surfaced to the user only inside the Plan card's per-attendee tap-to-expand. The "Why these six?" dev/demo panel shows the broader ranked Match list for portfolio purposes.

---

## Open considerations

- **Embedding model:** `text-embedding-3-small` is the sensible default (cheap, fast, 1536 dims). Revisit only if quality issues surface.
- **Score calibration:** raw cosine scores are not intuitive. May want to map to a 0–100 "fit" number for display, calibrated against the mock dataset distribution.

## Forward-looking design notes

Captured here so the architecture stays compatible. None of these are MVP-scope.

### Gap-detection follow-up question loop

Free-text/voice input is double-edged: users sometimes over-share, sometimes under-share. After the initial extraction pass, run a *coverage check* against the schema:

- Which fields in `selfExtracted` / `lookingForExtracted` are empty or thin?
- Are any high-signal fields (e.g. `connectionType`, `socialPreferences`) missing entirely?

If coverage is below threshold, generate one or two targeted follow-up questions via LLM ("You mentioned you like building things — what kind of energy do you want from the people you spend time with?"). User responds (chat or voice), append to raw inputs, re-extract.

This is distinct from the *refinement* loop (user-driven, "more social"). This is a *gap-detection* loop, system-driven. The two loops share the same re-extraction pipeline.

No data model change required — fully additive on top of the current architecture. The `rawInputs` field is already designed to accumulate multiple turns of input.

### Tiered match-detail disclosure

When showing a matched user, reveal short commonality labels first ("Chill vibes", "Both into startups"); reveal the *details* (e.g. "Both lived in Berlin under a year") only after the user expresses interest in the match. Builds curiosity without spoiling. UI-layer concern, not data model — captured here so we remember when designing the match card.

### Vibe Feedback — the data foundation for the Ora behavioral model

Per the Ora Intelligence Engine vision in `PROJECT.md` (and `/product/02-ora-intelligence-vision.md`), vibe feedback is **not just a UX feature** — it is the primary training-data collection mechanism for Ora's eventual proprietary behavioral model. Signal quality matters more than UX simplicity. Out of MVP scope to *capture*, but the MVP architecture must not preclude it.

**What vibe feedback will capture (Phase 2):**

- **Per-attendee click signal** — for each other attendee at a Plan, did the user click with them? (binary or 3-point: yes / neutral / no).
- **Group energy** — overall feel of the group (single rating).
- **Return intent** — would the user attend a Plan with this group again? (binary).
- **Per-Plan satisfaction** — was the activity / venue / time the right call independently of the people?
- **Stated-vs-revealed delta** — implicit. Aggregated across many Plans, this is where Ora learns the gap between what users said they wanted at onboarding and who they actually clicked with.

**Schema reservation (forward-looking):**

```ts
type Feedback = {
  feedbackId: string
  planId: string                  // links to the Plan it came from
  fromUserId: string              // who is giving the feedback
  perAttendee: {
    targetUserId: string
    clicked: "yes" | "neutral" | "no"
    note?: string                 // optional free-text
  }[]
  groupEnergy: 1 | 2 | 3 | 4 | 5
  wouldReturn: boolean
  planSatisfaction: 1 | 2 | 3 | 4 | 5
  submittedAt: string             // ISO timestamp
}
```

**Architectural commitments the MVP must honor today** so this drops in cleanly later:

- **Plans must be persistable.** Currently `Plan` is computed-per-request and not written to disk. The schema already has `planId` + `hostUserId` so it *can* be persisted; we just don't persist it yet. No breaking changes when we start persisting in Phase 2.
- **Every record carries a `userId`.** Already the rule (see `01-mvp-decisions.md`). Feedback links by IDs, not by sessions or names.
- **Embeddings stay swappable behind `findSimilar()`.** Already the rule. When the future fine-tuned Ora model replaces or augments cosine matching, swap is local.

The MVP itself doesn't capture vibe feedback (no real Plans run, no real attendees). But the data architecture is ready, which is what the Ora Intelligence Engine vision actually needs from this stage.
