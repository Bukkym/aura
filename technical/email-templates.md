# Supabase Email Templates

Canonical copies of the two auth email templates. The dashboard (Authentication
→ Email Templates) is the source of truth at runtime; keep this file in sync
whenever a template changes so the copy is versioned and reviewable.

Two rules both templates must follow:

1. **`{{ .Token }}` must be present.** It renders the 6-digit code. Sign-in
   uses the Magic Link template; a brand-new account's first email uses
   Confirm signup. If either template loses the token, that flow's email shows
   a link with no code.
2. **The link must use the `token_hash` format**, not `{{ .ConfirmationURL }}`.
   The default ConfirmationURL is PKCE-based and only works in the browser
   that requested it, so it breaks when tapped inside a mail app's built-in
   browser. The `token_hash` form works anywhere and is handled by
   `app/auth/callback/route.ts`. Appending with `&` is safe because the app
   always sends `emailRedirectTo` as `/auth/callback?next=...`, so
   `{{ .RedirectTo }}` always already contains a `?`.

The copy leads with the code, not the link: after requesting the email, the
user is sitting on the check-email screen with a code input, so the code is
the zero-friction path. The link is the fallback.

## Confirm signup

Subject: `welcome to aura`

```html
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#FAF7F2;color:#1A1530;padding:40px 24px;text-align:center;">
  <p style="font-size:28px;font-weight:600;letter-spacing:-0.02em;margin:0 0 22px;color:#7752E6;">aura</p>
  <p style="font-size:16px;line-height:1.55;color:rgba(26,21,48,0.7);max-width:420px;margin:0 auto 26px;">
    One last step. Enter this code where you left off and I'll start finding your people.
  </p>
  <p style="font-size:34px;font-weight:600;letter-spacing:0.18em;color:#1A1530;margin:0 0 26px;">
    {{ .Token }}
  </p>
  <p style="font-size:13px;color:rgba(26,21,48,0.45);margin:0 0 14px;">
    or, if it's easier
  </p>
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email" style="display:inline-block;background:#7752E6;color:#FAF7F2;text-decoration:none;font-weight:500;padding:14px 32px;border-radius:9999px;font-size:16px;">
    Open aura
  </a>
  <p style="font-size:13px;color:rgba(26,21,48,0.45);margin:26px 0 0;">
    The code and link are good for an hour. Didn't sign up? You can safely ignore this.
  </p>
  <p style="font-size:12px;color:rgba(26,21,48,0.4);margin:30px 0 0;">by Ora</p>
</div>
```

## Magic Link (sign in)

Subject: `your way in to aura`

```html
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#FAF7F2;color:#1A1530;padding:40px 24px;text-align:center;">
  <p style="font-size:28px;font-weight:600;letter-spacing:-0.02em;margin:0 0 22px;color:#7752E6;">aura</p>
  <p style="font-size:16px;line-height:1.55;color:rgba(26,21,48,0.7);max-width:420px;margin:0 auto 26px;">
    Welcome back. Enter this code where you left off and I'll pick up right where we stopped.
  </p>
  <p style="font-size:34px;font-weight:600;letter-spacing:0.18em;color:#1A1530;margin:0 0 26px;">
    {{ .Token }}
  </p>
  <p style="font-size:13px;color:rgba(26,21,48,0.45);margin:0 0 14px;">
    or, if it's easier
  </p>
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email" style="display:inline-block;background:#7752E6;color:#FAF7F2;text-decoration:none;font-weight:500;padding:14px 32px;border-radius:9999px;font-size:16px;">
    Sign in to aura
  </a>
  <p style="font-size:13px;color:rgba(26,21,48,0.45);margin:26px 0 0;">
    The code and link are good for an hour. Didn't ask for this? You can safely ignore it.
  </p>
  <p style="font-size:12px;color:rgba(26,21,48,0.4);margin:30px 0 0;">by Ora</p>
</div>
```
