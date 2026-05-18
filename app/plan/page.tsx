import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanScreen } from "./PlanScreen";

// /plan is the gated endpoint. If the user is not signed in, bounce to
// /auth/login?next=/plan; the magic-link flow returns them here. Once they
// land here authed, the Client wrapper reads their draft profile from
// sessionStorage and POSTs it to /api/plan/create.

export default async function PlanPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/plan");
  }

  return <PlanScreen />;
}
