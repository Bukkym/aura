import AskOra from "@/components/AskOra";

// "Ask Ora" surface inside the app. The chat itself is auth-gated at the API
// (/api/ora/chat verifies the session), so a signed-in user can refine plans,
// request new ones, or ask how Aura works. See technical/09-ora-agent-plan.md.

export const metadata = {
  title: "Ask Ora · Aura",
};

export default function OraPage() {
  return (
    <main style={{ padding: "32px 16px", minHeight: "100vh", background: "#FAF7F2" }}>
      <AskOra />
    </main>
  );
}
