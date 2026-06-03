# Deterministic Matching + Plan Generation (Module 3)

Zero runtime AI. Reuses the pgvector seed embeddings without generating any new ones at request time. Companion to `05-onboarding-spec.md` (the chip taxonomy) and the Module 3 plan in PROJECT.md.

Date: 2026-06-03.

The core problem: a brand-new authed user has ONLY structured chips, no precomputed embedding. The 175 seed users have BOTH chips AND embeddings. We match the new user against the seed pool using structured-tag overlap (no OpenAI), with a tiebreak that uses chip-token embeddings computed once at seed time.

---

## 1. New-user matching: hybrid weighted overlap + chip-centroid tiebreak

**Primary signal:** weighted structured-tag overlap (modified Jaccard) between the new user and each seed user. This is the workhorse and the only thing strictly needed for the demo.

**Tiebreak:** for the top ~30 candidates by primary score, add a chip-centroid cosine against the seed user's precomputed `self_embedding`. The centroid is built from a static table `chip_embeddings(token, category, embedding)` populated once at seed time, never at runtime. Zero runtime OpenAI; one extra Supabase read.

Why this over alternatives: pure tag overlap loses semantic adjacency (`techno` vs `vinyl` share no literal token but are embedding-neighbors); archetype-routing throws away within-archetype signal; a centroid-only primary loses to noise against the rich LLM seed embeddings. The hybrid keeps interpretable overlap as primary (it drives the "why this plan" copy verbatim) and uses the centroid as a soft tiebreak that catches semantic neighbors.

**Scoring formula** (per candidate seed user, host-perspective):

```
score = 0.35 * jaccard(host.lookingFor.personality,   cand.self.personality)
      + 0.20 * jaccard(host.lookingFor.interests,     cand.self.interests)
      + 0.15 * jaccard(host.lookingFor.activityTypes, cand.self.activityTypes)
      + 0.10 * jaccard(host.lookingFor.vibeKeywords,  cand.self.vibeKeywords)
      + 0.10 * jaccard(host.lookingFor.socialPrefs,   cand.self.socialPrefs)
      + 0.05 * connectionTypeOverlap(host, cand)   // 1 if any overlap else 0
      + 0.05 * neighborhoodOverlap(host, cand)     // 1 if any overlap or "any"
```

Then for the top 30 by score: `+ 0.05 * cosine(hostCentroid, cand.self_embedding)`. Final sort by combined score.

`jaccard(a,b) = |a ∩ b| / |a ∪ b|` over canonicalized lowercase strings (via `lib/canon.ts`). Custom (user-typed) chips contribute at 0.5 weight.

Executed as a single SQL function `rank_seed_users_for_host` over `users where archetype is not null`, using `jsonb_array_elements_text` + set intersection. The centroid tiebreak stays in TS so the SQL stays read-only and indexable.

---

## 2. Venue selection (deterministic)

Replaces the `embed()` + `match_places` call in `pickVenue` with a SQL function scoring by tag overlap + neighborhood:

```sql
create or replace function pick_venue_deterministic(
  activity_tags text[],
  vibe_tags     text[],
  neighborhoods text[],   -- host neighborhoods or {'any'}
  limit_n int default 5
) returns table(id uuid, name text, neighborhood text, score float)
language sql stable as $$
  select p.id, p.name, p.neighborhood,
         (
           cardinality(array(select unnest(p.activity_type_tags) intersect select unnest(activity_tags)))::float * 2.0
         + cardinality(array(select unnest(p.vibe_tags)          intersect select unnest(vibe_tags)))::float * 1.0
         + case when 'any' = any(neighborhoods) then 0.5
                when p.neighborhood = any(neighborhoods) then 1.5
                else 0.0 end
         ) as score
  from places p
  where cardinality(array(select unnest(p.activity_type_tags) intersect select unnest(activity_tags))) > 0
  order by score desc, random()
  limit limit_n;
$$;
```

Top 5, `random()` among ties so demos don't always land on the same cafe. Venue-hours filtering is future work (no hours columns yet).

---

## 3. Attendee selection (top 6)

`pickAttendees(host, activity, time)`:

1. `rankSeedUsersForHost(host)` → ordered candidates with scores (section 1).
2. Filter: candidate has `activity ∈ cand.self.activityTypes` OR `activity ∈ cand.lookingFor.activityTypes`.
3. Filter: `availabilityOverlap(host.availability, cand.self.availability)` non-empty (`anytime` matches everything).
4. Filter: candidate is not the host.
5. Take top 6. **Relaxation cascade** if <6 survive: relax filter 2 to "activity tag OR any shared interest with host", then filter 3 to "any overlap or `anytime`". This prevents the empty-result edge case.

Return the 6 with their per-candidate score breakdown for `whyThisPlan`.

---

## 4. Why-this-plan (deterministic template)

Compute the shared-tag triple across the 6 attendees + host (top shared interest, top shared vibe, the chosen activity), plus a standout pair with extra overlap. Templates live in `lib/whyTemplates.ts`, picked by hash of `(host.id, plan_date)` for stable refreshes. Empty slots drop their clause rather than print a placeholder. Examples:

> "Six people who all picked **{sharedInterest}** and **{sharedVibe}** energy, meeting for **{activity}** at **{venue}** on **{day} {timeOfDay}**. **{name1}** and **{name2}** also picked **{secondaryActivity}**."

> "**{activity}** at **{venue}**, **{day} {timeOfDay}**. Everyone here leans **{sharedVibe}** and is into **{sharedInterest}**. **{name1}**, **{name2}**, and **{name3}** specifically picked **{secondaryActivity}** too."

> "You picked **{hostTopVibe}** and **{hostTopInterest}**. So did **{name1}**, **{name2}**, and **{name3}**. Meeting at **{venue}** for **{activity}**, **{day} {timeOfDay}**."

All data-driven, no LLM. The Lovable prototype's "WHY THIS PLAN" copy is the aesthetic reference (specific names, specific shared tags), but ours derives from real overlap.

---

## 5. Concrete code changes

**New files:**
- `lib/canon.ts` — `canonicalize(tag, category)` lookup collapsing seed drift (`easy-going`→`easygoing`, `settled in Berlin`→`settled`, `exploratory`→`explorative`, etc.). Applied on read in `lib/match.ts` and at seed-replay time.
- `lib/whyTemplates.ts` — three templates + slot-filler.
- `scripts/seed-chip-embeddings.ts` — one-time: enumerate all chip taxonomy tokens + every distinct canonicalized seed token, batch-embed once, write to the table. Never invoked at runtime.
- `supabase/migrations/<ts>_chip_embeddings.sql` — `chip_embeddings(token text pk, category text, embedding vector(1536))` + HNSW index. Pure storage.
- `supabase/migrations/<ts>_pick_venue_deterministic.sql` — section 2 function.
- `supabase/migrations/<ts>_rank_seed_users_for_host.sql` — section 1 Jaccard-over-jsonb function.

**Modified files:**
- `types/index.ts` — schema delta from the onboarding spec.
- `lib/match.ts` — replace `rankMatches(user, candidates)` with `rankSeedUsersForHost(host)`. `explain()` stays (pure TS) and is reused by templates.
- `lib/findSimilar.ts` — add the `rankSeedUsersForHost` RPC wrapper; flag `findSimilarUsers`/`findSimilarPlaces` as unused-but-kept.
- `lib/generatePlan.ts` — `pickVenue` calls `pick_venue_deterministic` (no `embed()`); `pickAttendees` rewritten per section 3; `generateWhyThisPlan` calls `renderWhyTemplate` (no OpenAI).
- `app/api/plan/create/route.ts` — remove `embedBatch`; derive a chip-centroid from `chip_embeddings` and write it into `self_embedding`/`looking_for_embedding` so the columns stay non-null and the legacy `match_users` path keeps working as a fallback; apply server-side defaults before persist.
- `lib/embed.ts` — keep (the one-time seed scripts use it) but gate `embed`/`embedBatch` behind `EMBED_ALLOW_RUNTIME` so a stray import can't reintroduce OpenAI into the request path.
- `scripts/seed-users.ts` — run tags through `lib/canon.ts` so seed vocab matches onboarding picks. No re-embedding; existing embeddings stay.

Writing the centroid as a stand-in keeps `self_embedding`/`looking_for_embedding` NOT NULL, so no nullability migration is needed.

---

## 6. Module 4 migration path

The chip taxonomy + canonicalization layer is the load-bearing contract; everything else is swappable.

- **Chip schema is the contract.** LLM extraction output is JSON-schema-constrained to the same closed taxonomies; off-vocab tokens are dropped. Onboarding screens become confirm-or-edit instead of from-scratch.
- **Matching code is untouched.** Adding Whisper + extraction never reaches into the ranker.
- **`whyThisPlan` becomes a soft-swap.** `lib/whyTemplates.ts` stays as the deterministic fallback. A new `lib/whyNarrate.ts` wraps an LLM call on the same payload; on error or >800ms timeout it falls through to the template. Same Plan card, two narrators.
- **Embeddings catch up lazily.** A background job re-embeds chip-onboarded users via the real stringifier, replacing the centroid. No user-visible change; just upgrades tiebreak quality.
