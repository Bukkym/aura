# UI Flow — Bootcamp MVP

The complete screen-by-screen flow for Phase 1. Aligned with `/branding/` (visual identity + voice) and `/technical/02-data-model.md` (data model + Plan generation).

Date: 2026-05-07

---

## Bird's-eye

Six screens, with one repeating template (voice prompt) and three named Ora moments between them.

```
1. Welcome              [Ora surface]    Brand moment, "Begin"
2. Voice prompt         [Ora surface]    Single open prompt, user talks freely
                                           → Whisper → extract → coverage check
3. Follow-up loop       [Ora surface]    1-2 targeted questions if extraction is thin
                                           (reuses voice-prompt template)
4. Chips review         [Aura surface]   "Here's what I heard." Editable.
5. Plan card            [Aura surface]   The Plan + the picked attendees + inline refinement
6. WhatsApp invite      [Aura surface]   Editable invite message + copy / deeplink CTAs
```

Three Ora moments (atmospheric overlays, never loading spinners):
- *"Reading your aura..."* — between voice → extraction (Screen 2 → 3 or 2 → 4)
- *"Finding your first Plan..."* — between chips → Plan (Screen 4 → 5)
- *"Adjusting..."* — on refinement (within Screen 5)

The rhythm: Ora opens you up, Aura helps you act, Ora returns at the moments that matter.

---

## Surfaces and tokens (recap from visual identity)

**Aura surface (everyday, screens 4-6):** background `#FAF7F2`, ink `#1A1530`, accent violet `#7752E6`, lavender `#C97DFF`, coral `#FF7BAC`.

**Ora surface (atmospheric, screens 1-3 and the in-flow Ora moments):** background `#0E0B22`, ink `#FAF7F2`, electric indigo `#5B2EFF`, luminous violet `#A237FF`, electric magenta `#FF3D9A`.

Type: Cabinet Grotesk for the wordmark and headers; Cabinet or Geist Sans for body. Lowercase wordmark "aura" — no glyph. Ora's mark is the luminous aurora ring, used as the AI presence indicator and the app icon.

---

## Screen 1: Welcome

**Surface:** Ora — full-bleed deep indigo `#0E0B22`.

**Layout (vertically centered):**

- Aurora ring centered, ~120px diameter, slow pulse (~4s cycle, subtle scale + glow shift).
- Wordmark "aura" below the ring, Cabinet Grotesk Medium, ~64px, `#FAF7F2`.
- Tagline below: *"Your people are out there. Let's find them."* — ~18px, `#FAF7F2` at 70% opacity.
- Single CTA below: *"Begin"* — violet button (`#7752E6` fill) or aurora-gradient fill.
- *"by Ora"* in the bottom-right corner, ~12px, 50% opacity.

**Motion:**
- Aurora ring pulses slowly.
- Behind everything: subtle aurora gradient bloom drifting in the background — atmospheric, low-opacity, nebula-photography feel.
- Static otherwise.

**Why minimal:** brand voice is concise, direct, no hedging. Welcome screens that explain the product undermine confidence.

---

## Screen 2: Voice prompt

**Surface:** Ora — same indigo, no jarring transition. The aurora ring grows from its Welcome size to become the focal point.

**Prompt copy (header):**

> **Tell me about yourself, what you're into, and the kind of people you'd like to meet.**

Cabinet Grotesk, ~28px, `#FAF7F2`.

**Hint below:** *"Take your time. Speak however feels natural."* — ~14px, 50% opacity.

**The aurora ring is the only interactive element.** Tap to start, tap to stop. No record button, no waveform meter, no timer.

### Four states:

**1. Idle.** Ring at default slow pulse. Prompt fully visible. Whole screen breathing.

**2. Recording.** Ring pulses more strongly with audio-reactive subtle modulation (responds to user's voice volume). Prompt fades to ~30% opacity. Tiny "tap to stop" hint near the ring.

**3. Processing.** Ring shifts to a slow continuous rotation of the aurora gradient. Microcopy below: *"Reading your aura..."* — this is the first named Ora moment. Lasts ~3-5 sec while Whisper transcribes and the LLM extracts.

**4. Review.** Ring returns to rest. Transcribed text appears in soft body copy: *"You said:"* [transcript]. Two options:
- **"Sounds right →"** (continue)
- **"Let me try again"** (re-record)

The Review state is intentional friction — it builds confidence and catches Whisper errors on Berlin-specific words and unusual interests.

**Top-left:** subtle "← back" affordance.

---

## Screen 3: Follow-up loop (template reuse)

If extraction coverage is thin (key fields empty: e.g. no `connectionType`, no `activityTypes`, etc.), Ora asks 1-2 targeted follow-ups *before* moving to the chips screen. This loop uses the **same voice-prompt template** as Screen 2 — the only thing that changes is the copy.

**Prompt format:**

> **One more thing —**
> *what kind of energy do you want from the people around you?*

The "One more thing —" framing keeps it conversational, not interrogative. Cap at 1-2 follow-ups max; beyond that the user feels quizzed.

**Skip the Review state** on follow-ups. By this point user trust is built and the answers are short. Record → Process → straight to next state.

**Coverage rules (drive when this loop fires):**
- `selfExtracted.activityTypes` empty → ask about activities
- `lookingForExtracted.connectionType` empty → ask about kind of connection
- `selfExtracted.socialPreferences` empty → ask about energy/social style
- `selfExtracted.interests` very thin (≤1 tag) → ask broadly about what they're into

Stop after the first thin field is filled, *or* after two follow-ups, whichever comes first.

---

## Screen 4: Chips review (first Aura surface)

**The transition itself is a brand moment.** The deep indigo lifts and the surface turns warm cream `#FAF7F2`. The aurora gradient bleeds upward and dissipates. The user "arrives" in the daylight.

**Layout (top to bottom):**

- Small aurora ring (~32px, static, atmospheric), top-center.
- Header: *"Here's what I heard."* — Cabinet Grotesk, ~32px, `#1A1530`.
- Subtext: *"Tap anything that's not quite right."* — ~14px, `#1A1530` at 60% opacity.

**Two clearly labeled sections:** `YOU` and `THE PEOPLE YOU'RE LOOKING FOR`.

Within each section, chips grouped by category:

- `YOU`: Personality / What you're into / What you like doing / How you socialize / Where you're at
- `THE PEOPLE YOU'RE LOOKING FOR`: Personality / Into / Vibe / What kind of connection

The "What kind of connection" group renders differently — it's a closed set rendered as multi-select pill toggles (filled = active, outlined = inactive):

- *"deep connections"* (`close-friendships`)
- *"a friend group"* (`social-circle`)
- *"people to do things with"* (`activity-buddies`)
- *"help finding my footing here"* (`new-city-support`)

**Chip behavior:**
- Tap a chip → small X appears, brief fade-out animation, chip removed.
- Tap "+" → inline text input opens, type, hit enter, chip appears.
- Uniform color: lavender outline, violet text on cream. Categories do the categorizing — no per-category coloring.
- Empty categories are *hidden*. The follow-up loop should have caught critical gaps before this screen.

**Bottom CTA:** *"Find my people →"* — violet button, `#7752E6` fill.

**Edge case:** if user removes all chips in a critical category (e.g. all interests, or all activity types), the CTA stays disabled with a quiet inline note (e.g. *"Add at least one thing you're into"*) until minimum coverage is restored. No modal, no toast.

---

## Screen 5: Plan card (the payoff)

**Before the user lands here:** the second named Ora moment. Aura cream surface darkens with a deep indigo overlay. Aurora ring pulses centered. Microcopy: *"Finding your first Plan..."* (~3-5 sec while Plan generation runs). Then the indigo lifts, and the Plan card staggers in.

**Surface:** Aura — cream `#FAF7F2`.

**Layout:**

- Header: *"Your first Plan."* — Cabinet Grotesk, ~32px, `#1A1530`.
- A single hero card containing:
  - **Activity type** as headline — ALL CAPS, Cabinet Grotesk Bold, ~24px (e.g. *"BOULDER GYM SESSION"*).
  - **Venue name + neighborhood** — *"Boulderwelt Friedrichshain"*.
  - **Date and time** — *"Saturday, May 17 · 11am"*.
  - Divider.
  - **`whyThisPlan` line** — the LLM's 1-2 sentence warm explanation in Ora's voice. *"You said you climb most weekends and want chill, ambitious people. This combination has that energy."*
  - Divider.
  - **Section label:** *"THE PEOPLE"*.
  - **Attendees, one per row:** aura swatch (~32px aurora-gradient circle, procedurally generated per user, no photo) + first name + a 1-line why-they-fit summary. Example: *"⊙ Jonas · also climbs · into startups"*.
  - Each attendee row taps to expand inline → full why-this-match details (the tiered-disclosure pattern):
    - Full commonality breakdown with detail lines.
    - Connection-type alignment.
    - Optional Ora one-liner read on the match.

**Bottom action row:**

- Refinement chips: *"Different activity"* / *"Different people"* / *"Different vibe"* / *"Looks good →"*
- Free-form refinement input below the chips: text + voice mic, placeholder *"Or tell me what to change."*

**Refinement (inline):**
- User taps a refinement chip OR submits text/voice input.
- Third named Ora moment fires: deep indigo bloom from the input row outward, aurora ring near the input, microcopy *"Adjusting..."* (~2-3 sec).
- Plan card updates in place — content morphs (activity, attendees, venue, or vibe shifts according to the refinement).
- The user's just-submitted refinement appears as a small chip above the input, stackable, removable.

**Aura swatch:** procedurally-generated aurora gradient per user, derived from the user's attribute hash. Each user has a unique "aura" — individual without being a profile photo. Honors the no-browsing-profiles rule (you don't see a face, you see their energy) and rhymes with the brand name.

**No match percentages on the Plan card.** Per-attendee fit reads through the prose ("also climbs · into startups"), not a metric. This aligns with the brand rule against metrics-driven feel. The "Why these six?" dev-mode panel has scores for portfolio reviewers; the user-facing surface doesn't.

---

## Screen 6: WhatsApp invite (handoff)

**Surface:** Aura — cream `#FAF7F2`.

**Layout:**

- Header: *"Your Plan is ready."* — Cabinet Grotesk, ~32px, `#1A1530`.
- **Compressed Plan summary card** at top:
  - Activity / venue / time as a one-block readout.
  - Aura swatches in a row + *"You + 6 others"*.
- Section label: *"Here's what we'd send to the group:"*
- **Editable invite message preview** in a card:

  > 👋 Hey, Ora here.
  >
  > You've all been picked for a Plan because of how you click. Saturday, 11am, Boulderwelt Friedrichshain. No prep needed, just show up.
  >
  > See you there.

  User can edit the text inline before copying.

- **Two CTAs side-by-side:**
  - *"Copy invite message"* — universal fallback, copies the text to clipboard.
  - *"Open WhatsApp →"* — deeplinks via `wa.me/?text=...` with the message pre-pasted. Pre-pastes the *text only*, not contacts (mock attendees have no real phone numbers; honest about MVP scope).
- Escape: *"← Back to my Plan"* — non-destructive.

**Why two CTAs:** the deeplink isn't 100% reliable across desktop browsers, so the copy button is belt-and-suspenders. Real product (Phase 2+) would use WhatsApp Business API for actual group creation; that's out of MVP scope.

**Invite voice — Ora speaks, not the host.** *"Hey, Ora here..."* reinforces Ora's role through to the handoff. Also more interesting from a brand POV than a generic host-voice WhatsApp invite. The *"No prep needed, just show up"* line ties to brand voice ("Show up. We handled the rest.").

---

## Microcopy library

Consolidated for consistency.

| Where | Copy |
|-------|------|
| Welcome tagline | *"Your people are out there. Let's find them."* |
| Welcome CTA | *"Begin"* |
| Welcome attribution | *"by Ora"* |
| Main voice prompt | *"Tell me about yourself, what you're into, and the kind of people you'd like to meet."* |
| Soft hint under prompt | *"Take your time. Speak however feels natural."* |
| Recording state | *"tap to stop"* |
| Processing (extraction) | *"Reading your aura..."* |
| Review prompt | *"Sounds right →"* / *"Let me try again"* |
| Follow-up framing | *"One more thing —"* |
| Chips header | *"Here's what I heard."* |
| Chips subtext | *"Tap anything that's not quite right."* |
| Chips section labels | *"YOU"* / *"THE PEOPLE YOU'RE LOOKING FOR"* |
| Connection-type pills | *"deep connections"* / *"a friend group"* / *"people to do things with"* / *"help finding my footing here"* |
| Chips CTA | *"Find my people →"* |
| Plan-gen Ora moment | *"Finding your first Plan..."* |
| Plan card header | *"Your first Plan."* |
| Plan card section label | *"THE PEOPLE"* |
| Refinement chips | *"Different activity"* / *"Different people"* / *"Different vibe"* / *"Looks good →"* |
| Refinement input | *"Or tell me what to change."* |
| Refinement Ora moment | *"Adjusting..."* |
| Invite header | *"Your Plan is ready."* |
| Invite preview label | *"Here's what we'd send to the group:"* |
| Invite text | *"Hey, Ora here. You've all been picked for a Plan because of how you click. [details]. No prep needed, just show up. See you there."* |
| Invite CTAs | *"Copy invite message"* / *"Open WhatsApp →"* |
| Escape | *"← Back to my Plan"* |

---

## Open follow-ups (not blocking dev)

- **Aura swatch generation** — needs a small procedural-gradient component (hash → 3-stop gradient over the aurora palette). Defer to implementation.
- **Audio-reactive ring modulation** — nice-to-have visual polish for recording state. If implementation is fiddly, fall back to a stronger uniform pulse during recording.
- **Refinement morph animation** — a smooth content morph between Plan states is polish. If brittle, fall back to a fade-out → fade-in transition.
- **Empty / error states** — out of MVP scope (happy path only). Capture later if needed for the demo.
- **Mobile / responsive treatment** — bootcamp ships web-only. Responsive sizing handled in implementation, not specified here.
