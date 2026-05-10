# Visual Identity

The visual system for Aura (the consumer product) and Ora (the AI presence inside it). Aligned with the strategy and voice in `01-brand-strategy.md` and the naming logic in `02-naming.md`.

Date: 2026-05-07

---

## Anchor concept: aurora

The product is named Aura. The aurora borealis is one of the most photogenic, emotionally evocative natural phenomena humans encounter, and it is literally a thing you call your friends to come look at. "Show your friends" is built into the source material.

Aurora colors (deep violets, electric magentas, coral pinks, with optional flashes of green) give us:

- **Warmth without dating-app pink.** We live in violet/coral, not red/hot-pink.
- **Intelligence without tech-bro blue.** Nothing cold, nothing corporate.
- **Atmospheric mystery for Ora.** Deep indigo backgrounds with luminous gradients deliver the 2050-oracle feel.
- **Energetic confidence for Aura.** Warm aurora gradients read as alive, social, daytime.
- **Differentiation.** Cleanly separates from Hinge, Partiful, Linear, Notion, every fintech, every "AI gradient" knockoff.

---

## Two surfaces, one family: the Aura / Ora split

Aura is the everyday product surface — warm, friendly, daytime. The user lives here. Ora is the AI's presence — atmospheric, slow-pulsing, intelligent — and shows up *as a brief moment*, not as a whole screen. The default surface is Aura cream. Ora visits in three short atmospheric beats per session.

This is a deliberate inversion of an earlier draft that put the entry flow on Ora's deep indigo. Leading with darkness was a tonal mismatch for a social product whose first emotional beat should be *spark and warmth*, not *moody and mysterious*. Ora's atmospheric darkness now functions like a camera flash: brief, reverent, and unmistakable when it happens.

|  | **Aura** (default — everyday product) | **Ora** (brief moments only) |
|---|---|---|
| **Backgrounds** | Warm off-white / soft cream | Deep midnight indigo (overlay, ~2-5 sec at a time) |
| **Gradients** | Soft aurora bloom: peach + lavender + violet at low opacity, behind cream | Deep aurora: electric magenta → violet → indigo, saturated, animated |
| **Mood** | Spark, warmth, "your people are out there" energy | Atmospheric, intelligent presence revealing itself |
| **Typography** | Warm geometric sans, regular weight, dark ink on cream | Same family, light ink on indigo |
| **Motion** | Calm, slow, ambient | Slow rotation of the aurora gradient, breathing |

### When Ora visits

Three named moments per session, no others:

1. **"Reading your aura..."** — between voice input and extraction (~3-5 sec).
2. **"Finding your first Plan..."** — between chips review and Plan card (~3-5 sec).
3. **"Adjusting..."** — when the user submits a refinement on the Plan card (~2-3 sec).

**Crucially: the surface does NOT flip.** A full-screen indigo flash for a 2-3 second moment reads as visual whiplash, not reverence. Instead, Ora moments are rendered as a **localized bloom centered on the aurora ring**: layered radial gradients (luminous violet + electric magenta + deep indigo) bloom outward from the ring and fade to transparent before they reach the screen edges. The cream world stays intact. The ring becomes a luminous portal in a small pool of aurora dark — atmospheric, contained, and unmistakable.

The transition is a 600ms fade-in for the bloom; the ring shifts from calm pulse to slow rotation in step. When the moment ends, the bloom fades out and the ring returns to rest.

Everywhere else — Welcome, Voice prompt (idle/recording/review), Follow-up loops, Chips review, Plan card, WhatsApp invite — lives on the Aura cream surface, with no overlay.

---

## Color palette

### Aura mode (warm aurora — the everyday surface)

| Token | Hex | Use |
|-------|-----|-----|
| `aura-bg` | `#FAF7F2` | Primary background (warm white) |
| `aura-coral` | `#FF7BAC` | Warm accent / energy |
| `aura-lavender` | `#C97DFF` | Soft accent / secondary |
| `aura-violet` | `#7752E6` | Primary brand violet |
| `aura-ink` | `#1A1530` | Body text / high-contrast surfaces |

### Ora mode (deep aurora — atmospheric AI surface)

| Token | Hex | Use |
|-------|-----|-----|
| `ora-bg` | `#0E0B22` | Deep indigo background |
| `ora-indigo` | `#5B2EFF` | Electric indigo |
| `ora-violet` | `#A237FF` | Rich luminous violet |
| `ora-magenta` | `#FF3D9A` | Electric magenta highlight |
| `ora-light` | `#FAF7F2` | Text on Ora surfaces |

### Single-color anchor

When the brand needs a single solid color (favicon, mono contexts, app store listing fallbacks), use luminous violet `#A237FF`. That is the "Aura/Ora" anchor color.

These hex codes are the starting point. Tune saturation and lightness once we see them rendered in context.

---

## Typography

**Wordmark + UI:** Cabinet Grotesk (warm geometric sans, characterful but readable, free for commercial use).

**Body / UI text:** Cabinet Grotesk in lighter weights, or paired with Geist Sans for tighter UI density. Single-typeface system preferred for MVP simplicity.

**Why not Inter:** overused, reads as default-tech.

The lowercase wordmark "aura" is set in Cabinet Grotesk Medium. Optional aurora-gradient fill in colorful contexts; solid violet (`#7752E6`) or midnight (`#1A1530`) in mono contexts.

Custom-tweaked letterforms (subtle bowl adjustment on 'a' to echo the aurora-orb shape) are a v2 polish, not v1.

---

## Logos and marks

### Aura wordmark

Lowercase "aura", Cabinet Grotesk Medium. Wordmark only — no glyph required. This is what greets users on the landing page, app store listing, marketing surfaces.

### Ora mark — a luminous aurora ring

Ora's identity is a **luminous ring** with aurora gradient. The visual rhyme: Ora reads your aura, so Ora's symbol *is* the aura ring.

Behaviors:
- Static in mono contexts (company logo, footer)
- Lives on the Aura cream surface in idle/recording states. Lives on Ora indigo only during the three named moments above.
- Used as the **app icon**: deep indigo background, luminous aurora ring centered. This will stand out against the rounded-square colorful app-icon herd.
- Spins (slow rotation of the aurora gradient) only during Ora moments. Pulses calmly otherwise.

The wordmark "aura" is the friend who greets you. The ring is the entity reading you.

### Motion language for the ring

Calm, ambient, *never* anxious or surveillance-y. Specific commitments:

- **Pulse cycle: ~7 seconds** (one full breath in + out). Slower than a heartbeat, closer to deep breathing. Reads as ambient presence, not heart rate.
- **Pulse amplitude: subtle** — ~3% scale variation, ~10% opacity variation. Just enough to feel alive.
- **Recording state uses the SAME calm pulse as idle.** No intensity bump, no audio-reactive modulation. The ring is *present*, not *responsive to your voice*. This was a deliberate reversal of an earlier draft: a ring that reacted to voice volume read as surveillance to a meaningful subset of users; a calm ring just feels like attention.
- **Processing state: slow rotation** of the aurora gradient (~10 sec per revolution). Different from pulse — gives the unmistakable "Ora is thinking" beat.
- **Rest state (after recording, before continuing): no animation, halo opacity drops.** Calms the screen so the user can read their transcript.

These rules apply to every place the ring appears in the product.

---

## Domain

`aura.com` is taken. Ranked options:

1. **youraura.com** (or `.app`) — clever because the brand promise is "Ora reads *your* aura". Personalizes the URL.
2. **aura.app** — premium TLD, possibly available, expensive but clean.
3. **meetaura.com / hellaura.com / tryaura.com** — established pattern (Hinge → hellohinge, Partiful → tryparti).
4. Fallbacks: `getaura.com`, `aura.so`, `aura.club`, `aura.life`.

To-do before committing: Whois sweep + trademark conflict check (the AURA Premium Dating Class 45 conflict noted in `02-naming.md` is the key watch-out).

---

## Mood references

Worth a 5-min look to align on feel:

- **Aurora photography** — actual northern lights, especially Iceland/Norway long-exposure shots. Atmospheric purples and pinks against dark sky.
- **Partiful** (party-invite app) — closest existing brand to our energy. Atmospheric purple/black, social-spark feel. We push warmer and less raver than them.
- **Linear** (only the atmospheric gradient *technique*, not the colors) — for layered gradient blooms.
- **Apple Music** album-art-derived gradient backgrounds — for how aurora gradients can feel alive.

### Steering away from

- Co-Star (too astrology-coded)
- Hinge / Bumble (dating-app pinks)
- Notion / Linear (blue-violets — too tech-corporate)
- Generic "AI app" gradients (everyone's doing them)
- Anything earth-tone (therapy-adjacent)
- Anything monochrome blue (fintech / cold tech)

---

## Open follow-ups

These are not blocking the UI flow but should land before the visual system locks:

- **Domain selection** — pick from the ranked options above after Whois + trademark sweep.
- **App icon execution** — the indigo + aurora ring concept needs a designed pass before shipping.
- **Motion language for Ora** — the breathing/gradient-shift behavior needs a defined timing curve and trigger spec when we get to the actual UI.
- **Photography / illustration style** — if/when marketing surfaces need imagery beyond the gradient system. Lean: real human moments shot in low warm light, never stock-photo "diverse group laughing." Defer until landing page.
