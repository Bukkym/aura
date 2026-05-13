import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client for Server Components, Route Handlers, and Server Actions.
// Reads + writes the auth cookies on the incoming request so calls execute
// as the signed-in user. Falls back to anon when no session cookie is set.
//
// Next.js 15 ships an async `cookies()`, so this factory is async too.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component is a no-op: cookie writes
            // there are not allowed. Route Handlers / Server Actions / middleware
            // refresh the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}
