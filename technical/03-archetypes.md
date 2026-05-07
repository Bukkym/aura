# Archetypes — Macro Social-Mode Clusters

The 7 archetypes that structure mock-data generation in the bootcamp MVP and act as hard cluster pools in the real product.

Date: 2026-05-07

---

## What an archetype IS (and isn't)

**An archetype is a social *mode*, not an interest set.**

Same archetype = same kind of social experience someone is seeking. Different interests *within* an archetype is normal and expected.

Concrete: under "Ambitious Creators" you'd find a B2B SaaS founder, a novelist on her second book, an indie filmmaker, a game developer, and a designer running a Substack. Zero topic overlap. They click because the *mode* is shared — build life, ambition, "what are you working on?" energy, comfort with talking shop, working weekends being normal.

So interest matching happens *inside* the archetype, not instead of it. The archetype gets you into the right room; interests + personality + connectionType decide who you actually talk to in that room.

### Why this axis (and not another)

Activity groups form around *going to a thing* — a hike, a club night, a gallery, a dinner. The choice of "what are we doing" is what makes a group a group. So the macro cluster has to map to that choice, which means it has to be about social-mode/scene, not about social style.

Other valid axes exist (e.g. "how someone socializes" — depth vs. breadth, planned vs. spontaneous). Those are real, but secondary, and largely captured at the micro level via `socialPreferences`, `connectionType`, and `lookingFor`. They don't replace social-mode at the macro level.

---

## The 7 archetypes

Each archetype is described city-agnostically. Specific venue/scene signals are city-dependent and get filled in at seed-data generation time (e.g. Berghain in Berlin, Nowadays in NYC, Coda in Toronto).

### 1. Ambitious Creators
*Build mode. Anyone whose social mode is shaped by what they're making.*

- Includes: founders, freelancers, designers, writers, artists, indie hackers, musicians with output, side-project obsessives.
- Looking for: people who get the build life, intellectually curious, won't think Saturday work is weird, ambitious without performative hustle.
- City coverage: SF (mecca), NYC, Toronto, London, Lisbon, Berlin — all strong. Universal.

### 2. Cultural Explorers
*Curious-mind mode. Consume the city, talk about ideas, engage with art and culture as a primary social activity.*

- Includes: gallery-goers, indie cinema, theater, philosophy/book scene, food-as-experience scene, live music attenders.
- Looking for: thoughtful, opinionated, well-read but not pretentious, willing to do the thing not just talk about doing it.
- City coverage: universal. Especially strong in NYC, London, Berlin, Paris, Toronto, Mexico City.

### 3. Scene & Nightlife
*Going-out mode. Music and dance as a primary social identity. Late nights, hedonistic but curated.*

- Genre-agnostic: techno in Berlin, warehouse / queer parties in Brooklyn, jazz/hip-hop scenes in Toronto, club culture in London, drag/dance scenes in Mexico City. Same mode, different soundtrack.
- Looking for: people who hold space on a dance floor without being chaotic, can do the night and the day after, no judgment in either direction.
- City coverage: universal but flavor varies wildly by city.

### 4. Outdoor & Active
*Movement mode. Body-in-motion as primary social glue.*

- Includes: cycling, hiking, climbing, running, lake/beach days, surfing, bouldering gyms, weekend nature trips, casual recreational sports.
- Looking for: spontaneous, energetic, doesn't flake, low-maintenance, says yes to a Thursday lake plan.
- City coverage: universal but density depends on nature access. SF, Toronto, Berlin, Lisbon strong. NYC has its slice.

### 5. Wellness & Inner-Work
*Reflective mode. Yoga, somatics, breathwork, therapy-fluent, retreats, sober-curious, contemplative practice.*

- Looking for: emotionally present, willing to go deep, doesn't flinch at vulnerability, often slower-paced socially.
- City coverage: universal, especially strong in West Coast NA, LA, SF, Toronto. Berlin has it. Lisbon increasingly.

### 6. Cozy Connectors
*Hearth mode. Small circles, dinner parties, board games, slow weekends, neighborhood regulars. Depth over breadth.*

- Looking for: warm, consistent, dependable, prefers depth over breadth, will remember your birthday.
- City coverage: universal. Doesn't depend on local culture at all.

### 7. Sports & Crew
*Team-and-spectator mode. Shared sports passion + game-day culture as primary social glue.*

- Includes: sports bar regulars, fantasy leaguers, fans who organize their week around games, rec/beer leaguers (soccer, hockey, kickball, padel).
- Distinct from Outdoor-Active: that's body-in-motion as glue. This is shared team identity + collective spectatorship as glue.
- Looking for: tribal, loyal, shows up for game day, comfortable in bar/group settings.
- City coverage: very strong Toronto / NYC / London / Boston / Chicago. Real-but-quieter SF / LA. Niche in Berlin. Universal-but-concentrated.

---

## Archetypes I considered and rejected

- **Tech / Startup** — folds into *Ambitious Creators*. Same social mode, same energy.
- **Foodie / Cocktail scene** — folds into *Cultural Explorers*. Same "consume the city" orientation.
- **Political / Activist** — real cluster in some cities, but in practice these folks anchor primarily in 1, 2, or 6 with politics as an interest layer rather than the social mode.
- **Faith / Spiritual community** — narrow mode, niche on most platforms.
- **Family / kids-stage** — out of MVP scope (target user is young, mostly single).
- **Personality-style archetypes** (Deep Connector, Spontaneous Explorer, etc.) — orthogonal to scene-mode. Captured at the micro level via `socialPreferences` and `connectionType`. Adds complexity at the macro layer without product benefit.

---

## Matching policy: MVP vs. real product

This is a deliberate split.

### Real product (per PROJECT.md product vision)
**Hard cluster pools.** Each user is assigned to one archetype on onboarding, invisibly. All activity groups draw from within that pool. The archetype defines the compatible neighborhood; embedding similarity + `lookingFor` + `connectionType` handle micro-matching inside.

### Bootcamp MVP (per `02-data-model.md`)
**Archetype-blind matching.** Pure cosine on `selfEmbedding` and `lookingForEmbedding`, no archetype filter. Reasons:

1. The MVP's job is to *demonstrate* that LLM-driven matching works. Pre-filtering by archetype would make the matching look good for the wrong reason — you'd only see matches inside the same cluster anyway.
2. If the embedding-based matcher *organically* surfaces same-archetype users at the top of the rankings, that's strong validation of the pipeline. (And we can verify this against the known archetype labels in the mock data.)
3. Archetype-as-hard-filter is a Phase 2 toggle, not a rewrite — it's one line in the matching function.

---

## Mock data mix strategy

~175 users total, ~25 per archetype. Distribution of `lookingFor` orientation:

- **80% intra-archetype primary preferences** — a Creator wanting other Creators, etc. This is the realistic default.
- **15% adjacent-archetype bridges** — specific cross-cluster pairs that genuinely click in real life:
  - Creator + Wellness (balance / grounding)
  - Cultural Explorer + Cozy Connector (depth-seekers)
  - Outdoor + Sports & Crew (overlap on physicality)
  - Scene & Nightlife + Cultural Explorer (creative-cultural overlap)
- **5% deliberate outliers** — users whose `lookingFor` doesn't match their `self` description. Tests how the matcher handles real, messy, internally-inconsistent users.

### Diversity axes within each archetype

Spread mock users deliberately across:
- Age (mid-20s through 40s)
- Berlin tenure (just arrived, ~6 months, 2+ years)
- Introvert/extrovert split
- Specific vs. open-ended `lookingFor` (some want very particular crowds, some are open)
- `connectionType` mix (close-friendships heavy / activity-buddies heavy / new-city-support heavy / mixed)

---

## Validation: how we know archetypes are working

For the MVP demo, since matching is archetype-blind, we can validate the cluster framing by checking:

1. **Top-K matches for a Creator should be majority other Creators** (allowing for the 15% bridges). If they're not, either the archetype definitions are leaky or the embedding pipeline isn't capturing social mode well.
2. **Cross-archetype matches that DO surface should be the known bridge pairs**, not random ones. Wellness + Nightlife matches at the top would be a red flag.
3. **The deliberate 5% outliers should match poorly across the board** — they're testing the lower bound.

These three checks become the MVP's matching-quality smoke test.
