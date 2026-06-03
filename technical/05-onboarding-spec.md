# Chip-Based Onboarding Spec (Module 3)

Zero AI at runtime. The user picks from closed chip taxonomies sourced from the seed pool, so a brand-new user lands in the same tag space as the 175 archetype-labelled mock users and deterministic matching works. The output schema is the existing `selfExtracted` / `lookingForExtracted` shape (with two additive deltas), so the matching pipeline reads the same structures it always has.

Date: 2026-06-03. Supports the Module 3 demo plan in PROJECT.md.

---

## Why chips, not voice (for Module 3)

Module 3 must work with no OpenAI dependency. Free-text or voice input requires an LLM to extract structured attributes, which is Module 4. So in Module 3 the user picks from a known taxonomy; the structured profile is captured directly, no extraction step.

**Voice is kept as a non-AI stub** (founder decision, 2026-06-03): the `/voice` screen still exists as an entry option. It records audio and stores the blob (so Module 4 can transcribe it retroactively), then routes the user into the chip flow to fill their profile manually. The chip flow is the real data capture in Module 3. The framing is honest: Ora is "still learning to listen," so for now you tap through. When Module 4 lands, Whisper transcribes the recording and the LLM pre-fills the chips; the chip flow stays as the confirm/edit surface and the contract is unchanged.

---

## 1. Entry choice

A short choice screen offers two paths:
- **"Talk to Ora"** → `/voice` (records, stores blob, then continues to chip flow). Module 3: no transcription.
- **"Tap through it"** → straight into the chip flow.

Both converge on the same chip flow. Voice is presented as a first-class option for the demo narrative and for accessibility parity, but in Module 3 it does not change what data is captured.

---

## 2. Screen flow (6 screens)

Each screen asks one thing, shows large tappable chips, multi-select unless noted. Progress dots at top (1/6). Back button always visible. Every screen has a "Skip" that falls through to the defaults in section 5.

### Screen 1 — Welcome / framing
**Ora:** "Hi. I'm Ora. I'll ask you six quick things, then introduce you to one person and a place to meet them. No swiping, no profiles. Ready."
- Single CTA: "Let's go." No chips. Sets the six-step expectation.

### Screen 2 — You: vibe + personality
**Ora:** "First, you. Pick the words that feel like you on a normal week."
- **Personality** (multi-select, pick ≥2)
- **Vibe** (multi-select, pick ≥2)
- "Next" enables once both minimums are met.

### Screen 3 — You: interests + activities
**Ora:** "What pulls your attention. And what you actually do."
- **Interests** (multi-select, ≥2)
- **Activities** (multi-select, ≥2)
- "Add your own" free-text at the end of each row, capped at 2 custom chips per row. Custom chips stored verbatim but flagged so matching downweights them (0.5x).

### Screen 4 — You: location + availability
**Ora:** "Where you are. When you're free."
- **Neighborhoods** (multi-select, pick 1-3 home/most-frequented; closed Berlin list). An **"Anywhere in Berlin"** toggle clears the selection and matches everywhere.
- **Availability** (multi-select, pick 1-3 time windows; closed canonical list)
- **Budget** (single-select: low / mid / high / any; default any)

### Screen 5 — Who you want to meet: type + traits
**Ora:** "Now them. What kind of connection are you after."
- **Connection type** (multi-select, ≥1; closed set of 4)
- **Personality you'd click with** (multi-select, ≥2; same vocab as Screen 2 personality)
- **Vibe** (multi-select, ≥1; same vocab as Screen 2 vibe)

### Screen 6 — Who you want to meet: shared ground
**Ora:** "Last one. What you'd want to share with them."
- **Shared interests** (multi-select, ≥1; same vocab as Screen 3 interests)
- **Shared activities** (multi-select, ≥1; new field on `LookingForExtracted`, same vocab as Screen 3 activities)
- **Social style** (multi-select, ≥1; small closed list)
- Submit CTA: "Find my people." The just-in-time auth gate fires here, then `/api/plan/create`.

No confirm/review screen: the Plan card is the reveal, and chips can be edited from a "Refine" affordance on the Plan card.

---

## 3. Chip taxonomy (sourced from the seed pool audit)

All values are canonicalized (drift like `easygoing`/`easy-going`, `settled`/`settled in Berlin`, `explorative`/`exploratory` collapses to one form via `lib/canon.ts`). Ordering = seed-pool frequency, most common first. These are the closed picker vocabularies the new user chooses from. Because they are mined from the seed pool, a new user's picks overlap with real seed users.

### Personality (shared by self + lookingFor)
`curious`, `open-minded`, `adventurous`, `creative`, `thoughtful`, `chill`, `ambitious`, `introverted`, `extroverted`, `enthusiastic`, `easygoing`, `passionate`

### Vibe (shared; promoted from `vibeKeywords` to a first-class chip)
`chill`, `creative`, `cozy`, `intellectual`, `laid-back`, `adventurous`, `introspective`, `underground`, `artsy`, `genuine`, `deep`, `explorative`
Crosses both user `vibeKeywords` and `places.vibe_tags`, so explainability ("matches your cozy vibe; the venue is cozy") works.

### Interests (shared)
`art`, `music`, `philosophy`, `startups`, `cycling`, `climbing`, `yoga`, `cooking`, `techno`, `vinyl`, `books`, `design`, `indie film`, `outdoors`, `food`

### Activities (self side today; new on lookingFor side)
`dinner parties`, `gallery openings`, `boulder gym`, `lake days`, `cycling tours`, `indie cinema`, `yoga studios`, `museum afternoons`, `breathwork circles`, `techno clubs`, `book clubs`, `brunches`, `hiking`, `board game nights`, `cafe work sessions`

### Social preferences / social style
`small-group`, `one-on-one`, `low-pressure`, `spontaneous`, `consistent`, `intimate`, `casual`, `high-energy`, `deep conversations`, `lively`

### Connection type (closed set of 4, unchanged)
`activity-buddies`, `close-friendships`, `social-circle`, `new-city-support`
Rendered with friendly labels: "people to do things with" / "deep connections" / "a friend group" / "help finding my footing here"

### Neighborhoods (new; closed Berlin list, sourced from `places.neighborhood`)
`Kreuzberg`, `Mitte`, `Prenzlauer Berg`, `Wedding`, `Friedrichshain`, `Neukölln`, `Tiergarten`, `Charlottenburg`, `Rummelsburg`, `Moabit`, `Schöneberg`, `Tempelhof`
Plus the "Anywhere in Berlin" toggle, which stores `['any']`.

### Availability (new as a picker; `availability` field already exists)
`weekday evenings`, `weekday mornings`, `weekend mornings`, `weekend afternoons`, `weekend evenings`, `weekends`, `anytime`
Canonical set. Note the seed pool has drift here (`weekends` 128, `weekday evenings` 80, plus long-tail variants) that `lib/canon.ts` collapses.

### Budget (single-select; field already exists)
`low`, `mid`, `high`, `any` (default `any`)

---

## 4. Schema deltas

Minimal and additive. No SQL migration needed (both columns are `jsonb`).

`SelfExtracted`:
- `availability: string[]` — already exists, now required (was optional + unused). Default `['weekends']` if skipped.
- `neighborhoods: string[]` — NEW. The user's home/frequented areas, or `['any']`.

`LookingForExtracted`:
- `activityTypes: string[]` — NEW. Shared activities the user wants with the people they meet (Screen 6).
- `neighborhoods?: string[]` — NEW, optional. Defaults to the host's own neighborhoods if omitted.

`vibeKeywords` stays the field name on both sides; the Vibe chip writes into it.

---

## 5. Defaults for skipped chips

So matching can always run even if a user skips screens:
- Personality (self / lookingFor): `['open-minded']`
- Vibe (self / lookingFor): `['chill']`
- Interests (self / lookingFor): `['music']` (the most common seed interest)
- Activities (self): `['cafe work sessions']`; (lookingFor): copy from self activities
- Neighborhoods: `['any']`
- Availability: `['weekends']`
- Budget: `'any'`
- Connection type: `['activity-buddies']`
- Social style: `['low-pressure']`

Defaults are applied server-side in `/api/plan/create` before the row is written, so the persisted profile is always complete.

---

## 6. Migration to Module 4 (voice + LLM)

The chip schema is the contract. When AI lands:
- The stored voice blob from the Module 3 stub gets transcribed by Whisper.
- `lib/extract.ts` (real implementation) maps the transcript to the SAME chip taxonomy, pre-filling Screen 2-6 chips.
- The user confirms or edits. The chip flow becomes the confirm/edit surface rather than the primary entry.
- Matching, venue selection, and plan generation do not change: they already read the chip schema.

Nothing built in Module 3 is thrown away.
