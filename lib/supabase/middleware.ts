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
  await supabase.auth.getUser();

  return supabaseResponse;
}
