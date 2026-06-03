// Plain HTML form posting to the /auth/logout route handler. No client JS
// needed: the form submits, the route clears the session, redirects home.
// Rendered only on signed-in surfaces (the Plan screen).
export function SignOutButton() {
  return (
    <form action="/auth/logout" method="post">
      <button
        type="submit"
        className="text-sm text-aura-ink/50 underline-offset-4 transition hover:text-aura-ink hover:underline"
      >
        Sign out
      </button>
    </form>
  );
}
