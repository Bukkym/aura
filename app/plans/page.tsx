import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlansScreen } from "./PlansScreen";

// The Plans tab: the user's current Plan under "Coming up", with an empty
// "Earlier" history (plan persistence is Module 4). Gated like /home + /plan.
export default async function PlansPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/auth/login?next=/plans");
  return <PlansScreen />;
}
