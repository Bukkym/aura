import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HomeScreen } from "./HomeScreen";

// The signed-in hub: the "finding" beat, then the user's Plan as a card, with
// the Home · Ora · Plans bottom bar. Gated like /plan.
export default async function HomePage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/auth/login?next=/home");
  return <HomeScreen />;
}
