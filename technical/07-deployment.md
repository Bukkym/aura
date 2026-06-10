# Deployment — Slice 6 (Vercel + meetonaura.com)

The runbook for putting aura in production for the Module 3 demo. Background lives in `technical/04-infrastructure.md`; this is the click-by-click.

Date written: 2026-06-10. Target domain: **meetonaura.com**.

The app is AI-free at runtime (Module 3), so production is small: a Next.js app on Vercel talking to the existing Supabase project, with magic-link email via Resend. No prod database to stand up, no OpenAI key in the cloud.

---

## What runs where

| Piece | Where | Notes |
|---|---|---|
| Next.js app | Vercel | Region `fra1` (see `vercel.json`), close to EU Supabase + Berlin users |
| Database + auth | Supabase (existing `aura` project, EU/Frankfurt) | Same project as dev; schema + seed data already there |
| Magic-link email | Resend custom SMTP | Lifts Supabase's built-in email rate limit; sends from the brand |
| OpenAI | nowhere at runtime | Only the local seed scripts call it (`EMBED_ALLOW_RUNTIME=true`) |

There is **one** Supabase project shared by dev and prod. "Pointing Supabase at prod" just means adding the production callback URL to its allowed Redirect URLs, not creating a second project.

---

## Pre-deploy (local, already green)

```bash
npm run build            # production build must be clean
npm run seed:canon:check # seed tags canonical at rest (CI assertion)
npm run smoke:plan       # deterministic pipeline produces a Plan, no OpenAI
```

---

## 1. Vercel project

1. Vercel → **Add New… → Project** → import the GitHub repo `Bukkym/aura`.
2. Framework preset: **Next.js** (auto-detected). Build command `next build`, output auto. Root directory `/`.
3. **Do not deploy yet** — set env vars first (next step), otherwise the first build runs without them.

## 2. Environment variables (Production + Preview)

Set exactly these three under Project → Settings → Environment Variables. Copy the values from your local `.env.local`:

| Name | Scope | Value source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production, Preview | `.env.local` |
| `SUPABASE_SECRET_KEY` | Production, Preview | `.env.local` (server-only; never expose) |

**Do not add** `OPENAI_API_KEY`, `DATABASE_URL`, or `DIRECT_URL`. Nothing in the request path imports `lib/openai`/`lib/embed`, so the runtime never needs the OpenAI key; the connection strings are psql/migration-only. Adding the OpenAI key would re-introduce a secret the running app has no reason to hold.

Then **Deploy**. You'll get a `*.vercel.app` URL.

## 3. Domain — meetonaura.com

1. Vercel → Project → Settings → **Domains** → add `meetonaura.com` (and `www.meetonaura.com`, set it to redirect to the apex).
2. At your registrar, add the DNS records Vercel shows:
   - Apex `meetonaura.com` → Vercel's `A` record (or `ALIAS`/`ANAME` to `cname.vercel-dns.com` if the registrar supports it).
   - `www` → `CNAME cname.vercel-dns.com`.
3. Wait for Vercel to verify + issue the TLS cert (usually minutes). Confirm `https://meetonaura.com` loads the welcome screen.

## 4. Supabase — allow the production callback

Supabase Dashboard → Authentication → **URL Configuration**:

1. **Site URL**: `https://meetonaura.com`.
2. **Redirect URLs**: add `https://meetonaura.com/auth/callback`.
   - Keep `http://localhost:3000/auth/callback` for local dev.
   - Optional: add `https://*.vercel.app/auth/callback` if you want preview deploys to authenticate.

The login Server Action derives the origin from the request headers, so it sends the right `emailRedirectTo` per environment automatically — no env var needed. The callback only works if the resulting URL is in this allowlist.

## 5. Resend — brand email via custom SMTP

Magic-link email defaults to Supabase's shared SMTP, which is rate-limited (a few emails/hour) and sends from a generic address. For the demo, route it through Resend so emails come from `aura <hello@meetonaura.com>` and the limit lifts.

1. Resend → add domain **meetonaura.com**, add the DKIM/SPF/return-path DNS records it shows at the registrar, wait for "Verified".
2. Create an SMTP API key in Resend.
3. Supabase Dashboard → Authentication → **Emails → SMTP Settings** → enable custom SMTP:
   - Host `smtp.resend.com`, Port `465`, Username `resend`, Password = the Resend API key.
   - Sender name `aura`, sender email `hello@meetonaura.com`.
4. Authentication → **Email Templates → Magic Link**: confirm the template still includes the 6-digit `{{ .Token }}` alongside the `{{ .ConfirmationURL }}` link (the OTP path from Slice 1 depends on it). See `README.md` → Auth.

## 6. Post-deploy smoke (do this before the demo)

On `https://meetonaura.com`:

1. **Full walkthrough**: `/` → onboarding (Begin → tap-through → 6-step chips → "Find my people →").
2. The auth gate bounces to `/auth/login?next=/plan`. Enter a real email, submit.
3. Check the email arrives **from `hello@meetonaura.com`** (confirms Resend), within seconds (confirms the rate limit lifted). Either click the link or paste the 6-digit code at `/auth/check-email`.
4. Land authenticated on `/plan`: the "finding" Ora moment → a real Plan card → "I'm in →" → the WhatsApp handoff.
5. **Sign out** (bottom-left on `/plan`), confirm `/plan` redirects back to `/auth/login`.
6. **`/demo-reset`** (while signed in) clears your profile so you can rehearse again.
7. Spot-check `/flow` (the design showcase) and `/plan-demo` (live card, no auth) render.

> The headless test rigs can't complete a real magic-link sign-in, so step 2–4 is the one part that must be done by hand at least once before the 17th.

---

## Rollback / gotchas

- A bad deploy: Vercel → Deployments → promote the previous green deployment. Instant.
- Magic link 404s or "otp_expired": the callback URL isn't in Supabase's allowlist, or the email template lost `{{ .Token }}`. See `README.md` → Auth and `app/auth/login/LoginErrorMessage` for the surfaced fragment errors.
- Emails not arriving: Resend domain not verified, or SMTP creds wrong in Supabase. Until Resend is set up, Supabase's built-in sender still works but is rate-limited — fine for a quick test, risky for a live demo with retries.
- The seed data lives in the shared Supabase project; no migration or re-seed is part of deploying. If you ever re-seed, run `npm run seed:canon` afterward so stored tags stay canonical.
