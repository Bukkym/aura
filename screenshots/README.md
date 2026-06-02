# Screenshots

Visual reference material for the design pass. Two subfolders, different purposes.

## `current/`

The current built screens of Aura. These are the **starting point** for the design pass — iterate from them, not from a blank canvas.

| File | What it shows |
|---|---|
| `01-voice-processing.jpeg` | `/voice` in the processing state, showing the (now fixed) Ora bloom around the AuroraRing |
| `02-chips.jpeg` | `/chips` with stub-data preferences, the YOU and "looking for" sections, and the connection-type pills |

For the Plan card, grab a fresh screenshot from `/plan-demo` — it generates a new Plan each visit so the screenshot stays current.

## `lovable/`

A Lovable-generated prototype I evaluated as a "what's the obvious solution" benchmark. **These are reference for what NOT to ship.** They violate several of Aura's brand guardrails — see the full breakdown in the design-system brief, but the headline mistakes:

- ❌ "MATCH" percentage bars on people cards (dating-app scorecard, explicitly ruled out)
- ❌ A browseable matches list (we pivoted from people-first to Plan-first months ago)
- ❌ Letter-circle avatars (we use procedurally generated aura swatches)
- ❌ Multi-step quiz with "QUESTION 1 / QUESTION 2" (we use one open prompt)
- ❌ Saturated orange/peach as the primary CTA color (we use `aura-violet` `#7752E6`)
- ❌ "Ora's plan for you" (third-person vendor framing; ours is "Your first Plan.")
- ❌ Phone-frame mockups (we ship web; mobile is Phase 2)
- ❌ Venue photo placeholders (we don't have or fake venue photos)

A few execution details from the Lovable prototype ARE worth borrowing:

- ✅ Vibe pills inside the venue area of the Plan card (we already have `vibeTags` on `places` in the schema)
- ✅ Relative time format with a calendar icon ("This Friday · 7:30pm")
- ✅ A warm gradient "header zone" at the top of the Plan card (without faking a photo)
- ✅ A compact "your group" attendee strip as a quick preview

| File | What it shows |
|---|---|
| `01-welcome.webp` | Welcome screen with "Find your people in Berlin." |
| `02-voice-idle.webp` | Voice prompt idle state, Question 1 |
| `03-voice-recording.webp` | Voice prompt recording state, Question 2 |
| `04-results-list.webp` | The matches list (this screen should NOT exist in Aura) |
| `05-plan-card.webp` | The Lovable Plan card, with the gradient header zone and vibe pills worth borrowing |
