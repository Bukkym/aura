import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Refresh the Supabase auth cookie on every request. See
// lib/supabase/middleware.ts for the why + the cookie-propagation dance.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Match everything except Next.js internals and static assets. The full
  // pattern is the one Supabase publishes — narrow it later if we add routes
  // that intentionally bypass auth.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
