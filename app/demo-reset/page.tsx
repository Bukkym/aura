import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { DemoResetClient } from "./DemoResetClient";

// Auth-gated demo reset (Slice 5). Clears the signed-in user's profile so the
// onboarding → Plan walkthrough can be rehearsed from scratch. Deletes the
// caller's public.users row (chip data + the requester record the Plan pipeline
// reads); the next onboarding run re-inserts a fresh row. The client half then
// clears the aura:draft sessionStorage and returns to /.
//
// The DB delete uses the admin client scoped to the verified user.id, so it
// works regardless of the RLS delete policy while still only ever touching the
// caller's own row.

export const dynamic = "force-dynamic";

export default async function DemoResetPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/auth/login?next=/demo-reset");

  const admin = createAdminClient();
  const { error } = await admin.from("users").delete().eq("auth_user_id", user.id);
  if (error) {
    // Surface the failure to the client rather than silently pretending success.
    return <DemoResetClient error={error.message} />;
  }

  return <DemoResetClient />;
}
