import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /auth/logout — clears the Supabase session cookies and sends the
// user home. POST (not GET) so a pre-fetch or an <img> tag can't sign the
// user out behind their back. The 303 turns the POST into a GET on the
// redirect target so the browser lands cleanly on /.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
