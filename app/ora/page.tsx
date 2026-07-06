import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AskOra from "@/components/AskOra";

// "Ask Ora" surface inside the app. Gated like /home: the API verifies the
// session too, but redirecting here means a signed-out visitor gets the login
// flow instead of a chat that 401s on every message.
// See technical/09-ora-agent-plan.md.

export const metadata = {
  title: "Ask Ora · Aura",
};

export default async function OraPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/auth/login?next=/ora");
  return (
    <main style={{ padding: "32px 16px", minHeight: "100vh", background: "#FAF7F2" }}>
      <AskOra />
    </main>
  );
}
