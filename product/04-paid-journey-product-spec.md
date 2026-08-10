# Paid Journey Product Spec

The product that sells a **crew, not a dinner**. Supersedes the single-plan flow
in `01-ui-flow.md` for everything past onboarding. Reuses: the onboarding chip
taxonomy (`/technical/05-onboarding-spec.md`), the matching engine
(`/technical/06-deterministic-matching.md`, `lib/match.ts`), and the aurora
visual system (`/branding/03-visual-identity.md`). Sits under the strategy in
`02-ora-intelligence-vision.md` and is gated by the liquidity math in
`/technical/08-future-considerations.md` §4.

Date: 2026-08-05.

---

## The model in one line

You show up to a great curated plan. You tell Ora who you clicked with. Ora
brings those people back next time, plus a couple of fresh compatible faces.
Over ~5 plans a real circle forms. **You pay for each great plan; the circle is
the payoff you feel, never a guarantee you're sold.**

### The three rules (every screen obeys these)

1. **Guarantee the plan.** Every plan is a good night, always deliverable. The
   paywall sits in front of a concrete deliverable, never a probabilistic
   outcome.
2. **Design the arc, don't promise it.** Copy promises the *process* ("we bring
   back the people you click with, your circle builds"), never a *result*
   ("you'll have a friend group by plan 5"). No refund liability on an outcome
   you can't control.
3. **Earn the arc with density.** Recurrence (re-seating the same people) only
   works once a niche is dense enough. Below the §4 floor, run Phase A only.

---

## Where the current build stands vs. the target

Honest gap assessment (routes/screens as of 2026-08-05):

- **Single-plan, not a journey.** `OnboardingFlow` → `/plan` (`live-plan.tsx`)
  generates ONE plan and hands off to WhatsApp. There is no next-plan, no
  progression, no cohort.
- **Free.** No payment anywhere. No Stripe, no checkout, no pricing.
- **No feedback loop.** No "who did you click with" capture. `plans` has
  `confirmed_at` / `declined_at` only. `plan_feedback` does not exist.
- **Attendees are references, not joiners.** `attendee_user_ids` are matched
  seed users, not real people who accepted and can come back. Recurrence is
  therefore impossible today (future-considerations §8 open item 1).
- **No landing page.** meetonaura.com routes straight into the app.
- **Over-built where it doesn't prove the business.** Voice AI, Ora agent, RAG,
  stretch plan: real engineering, zero WTP signal. Demote, don't delete.

Conclusion: yes, this is a start-to-finish redesign of everything past
onboarding, plus net-new payment, feedback, and recurrence systems, plus a
landing page. Onboarding and the visual language survive.

---

## Screen-by-screen map

| # | Screen | Route today | Status | What it becomes |
|---|--------|-------------|--------|-----------------|
| 0 | **Landing page** | none | **NEW** | Public marketing + demand/WTP capture. Sells the crew promise, captures city + email. See §Landing page. |
| 1 | **Onboarding** | `/` `OnboardingFlow` | **REUSE + reframe** | Keep the chip/voice capture. Add: pick city + niche; set the expectation ("we build your plans around who you click with, and keep bringing those people back"). No longer ends in a one-shot plan. |
| 2 | **Auth gate** | `/auth/*` | **REUSE** | Unchanged (magic-link / OTP). |
| 3 | **Your next plan** | `/plan` `live-plan.tsx` | **REDESIGN** | From "your one plan → accept → WhatsApp" to "your next plan, step N of your journey." Shows recurring faces distinctly from new ones once Phase B is on. Confirm is gated by payment (§4/§5 screens). |
| 4 | **Checkout** | none | **NEW** | Pay for this plan (Phase A: cheap standalone). After a good first plan, upsell the prepaid journey package. Stripe. |
| 5 | **Plan confirmed / logistics** | part of `live-plan.tsx` `AcceptedView` | **REDESIGN** | Keep address + private-number reassurance. Reframe from "invite the group" to "you're in, see you there." |
| 6 | **Post-plan feedback** | none | **NEW (core)** | "Who did you click with? Want to see them again?" Per-attendee, directional. This is both the arc hook and the vibe data. The single most important new screen. |
| 7 | **Your circle (journey)** | `/plans` `plans-tab.tsx` | **REDESIGN** | From upcoming/past list to a progression surface: step N of ~5, the faces recurring in your circle, next plan CTA. This is where the differentiation is felt. |
| 8 | **Home** | `/home` | **REDESIGN** | Returning-user hub: journey status, next plan, your forming circle. |
| 9 | **Group life** | none | **NEW (defer)** | Phase 3. Once a circle stabilizes: shared group space + ongoing plans. Build only after Phase B proves out. |
| — | Voice AI, Ora agent, stretch, `/ora`, `/flow` | various | **DEMOTE** | Keep code, remove from the core path. Not on the WTP-critical journey. |

---

## Net-new systems (the real work)

1. **Payments (Stripe).** Per-plan charge (Phase A) and a prepaid multi-plan
   package (Phase B). Refund/credit policy tied to Rule 1 (plan-not-good → make
   it right; never refund for "no group formed"). New `payments` table; webhook
   handling in an API route; a `lib/payments.ts` for the pure logic.
2. **Vibe feedback loop.** `plan_feedback(plan_id, rater_id, ratee_id,
   would_meet_again bool, created_at)`, directional, one row per (rater, ratee).
   Feeds both re-seating and, eventually, the Stage-1 moat test
   (`/technical/10-predictive-lift-experiment.md`).
3. **Recurrence / re-seating.** Matching change: next plan preferentially
   re-seats people this user (mutually) wants to see again, then tops up with
   fresh compatible faces, dropping non-mutual/low-vibe. Extends `generatePlan` /
   `lib/match.ts`. Depends on real joiners existing.
4. **Real membership + cohort state.** Migrate from `attendee_user_ids` array to
   a `plan_members` join table with per-member state (invited/joined/left), plus
   journey position (plan N of 5) and the forming-circle set. This is the
   shared-plan pool model (future-considerations §8 item 1). **Hard-gated on
   liquidity.**

---

## Build sequencing (WTP first, honest about the gate)

**Phase A — prove they'll pay for a great plan (build now).** Landing page +
onboarding reframe + one paid plan + checkout + post-plan feedback capture. It's
fine to Wizard-of-Oz the curation and even run recurrence by hand at first. Ship
to ONE Toronto niche. Success metric: they pay, it's good, they pay again.
Recurrence can be concierge; real re-seating logic waits.

**Phase B — the journey (build once one niche clears the §4 density floor,
~150+ active/availability-overlapping).** Real `plan_members`, re-seating logic,
the journey/circle surface, the prepaid package. This is where the
differentiation becomes systematic instead of manual.

**Phase C — group life (build once circles actually stabilize).** The Phase 3
surface. Long-term retention and monetization.

Do not build B before A pays and the niche is dense. Do not build C before B
produces stable circles.

---

## Platform: PWA now, native at Phase B

The product is mobile-first (IRL, on-the-phone, push-driven). That is settled.
The only live question is native app vs installable web app, and when.

**Now (Phase A): mobile-first PWA on the existing Next.js.** No rebuild, ships
today, iterates same-day with no app-store review between a fix and the user.
Covers the one thing that seems to need native: push. Web push works on Android
fully and on iOS for installed PWAs (iOS 16.4+), which covers the two
push-critical moments (plan reminder, post-plan feedback nudge). A link is lower
friction than "download this" for the first paying users. This is the fastest
path to the WTP answer, and these designs are already phone screens.

- **Plan around the iOS catch:** web push on iOS fires only after the user adds
  the app to their home screen. Design an explicit "add Aura to your home screen
  so we can nudge you before plans" moment; don't discover it late.

**Later (Phase B): go native (React Native / Expo).** For consumer social
specifically, native matters more than for a B2B tool, and mostly for
non-technical reasons: app-store presence is discovery and word-of-mouth
credibility ("what's it called, I'll download it"), plus better push reliability
and device integration (contacts, calendar, camera). None of that helps answer
"will they pay," so it waits. The design system, matching engine, and data/AI
layer all port; the frontend is a rebuild you'll have earned (PROJECT.md already
anticipates this).

- **Trigger to switch:** paying, retained users exist AND app-store
  discovery/credibility or push reliability has become the cap on growth. Not
  before.

---

## Landing page (§ own spec)

**Job:** two jobs at once. (1) Sell the differentiated promise. (2) Capture
demand as a WTP/density signal (city + email), since we launch city-by-city.

**Voice:** warm, spark, "your people are out there." Never moody, never
dating-app. Never name a competitor.

**Visual (from `/branding/03-visual-identity.md`):** Aura cream `#FAF7F2`
default surface, warm aurora bloom behind the hero (peach + lavender `#C97DFF` +
violet `#7752E6` at low opacity). Lowercase "aura" wordmark in Cabinet Grotesk.
Ink `#1A1530` type. The Ora aurora-ring as a single quiet motif, calm 7s pulse,
no full indigo surface. Mobile-first. NOT pink, NOT tech-blue.

**Section order:**

1. **Hero.** The crew-not-dinner promise in Aura's voice. e.g. *"Not another
   night out with strangers. Meet people you actually click with, then keep
   seeing them, until you've got your people."* One CTA: start / join in Toronto.
2. **How it works (the arc, 3 beats).** Show up to a curated plan → tell Ora who
   you clicked with → Ora brings them back, plus a couple new faces. "A few plans
   in, that's a circle, not a contact list."
3. **Why it's different.** The recurrence vs. roulette contrast, shown not
   named: same faces returning, a system that learns who you click with. This is
   the anti-Timeleft beat.
4. **Who it's for.** New to the city, rebuilding your circle, want a real social
   life without the group-chat logistics.
5. **The honest promise.** Every plan is a great night, we handle everything, you
   just show up. Your number stays private (the anonymous-line reassurance).
6. **CTA.** City picker (Toronto live, others = waitlist). Email capture doubles
   as the density waitlist and the demand test.

**What NOT to put on it:** no "AI social intelligence" jargon, no "friend group
guaranteed," no feature list of the voice/agent tech. Sell the feeling and the
outcome-as-design, gated by Rule 2.

---

## Change Log

- 2026-08-05: Spec created. Defines the paid-journey product (crew-not-dinner),
  the three rules (guarantee the plan, design the arc, earn it with density), the
  screen-by-screen redesign map against the current build, the net-new payment /
  feedback / recurrence / cohort systems, the WTP-first build sequencing gated on
  the §4 liquidity floor, and the landing-page spec. Supersedes `01-ui-flow.md`
  past onboarding; reuses onboarding, matching, and visual-identity specs.
- 2026-08-05: Added the Platform section (mobile-first PWA on the existing
  Next.js now, native React Native/Expo at Phase B, with the iOS home-screen
  push caveat and the switch trigger). Locked visual direction recorded in
  `/branding/03-visual-identity.md` (Warm Aurora, soft edition).
