import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Called from middleware.ts on every request. Refreshes the Supabase session
// cookie if it's near expiry; without this, Server Components can drift to a
// stale or expired token and start receiving 401s on RLS-gated reads.
//
// The dance with `supabaseResponse` is verbatim from the Supabase SSR docs:
// cookies set during getUser() have to propagate both back onto the incoming
// request (so this handler reads them) AND forward onto the response (so the
// browser persists them). Reassigning `supabaseResponse` inside setAll() and
// re-attaching the cookies is what makes both happen.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: must be getUser() and not getSession(). getSession() reads the
  // cookie without revalidating; getUser() round-trips to the Supabase auth
  // server, which is what triggers the refresh flow.
  //
  // This round-trip runs on every request, so it must never be able to hang the
  // whole site. If Supabase is slow or unreachable (e.g. a paused project), we
  // cap the wait and degrade to "no refresh this pass" rather than letting the
  // Edge middleware time out and return a 504 on every route. A stale cookie for
  // one request is recoverable; a site-wide gateway timeout is not.
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("supabase-getuser-timeout")), 3000),
    );
    await Promise.race([supabase.auth.getUser(), timeout]);
  } catch {
    // Swallow: return the response as-is so the request proceeds unauthenticated
    // instead of failing. Auth-gated pages will redirect to sign-in as usual.
  }

  return supabaseResponse;
}
