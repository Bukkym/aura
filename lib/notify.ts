// Sending plan details to the user (email via Resend, SMS placeholder). The
// message body is pure + unit-tested; delivery is best-effort and gated on env
// config so the flow works with or without keys.

export interface PlanDetails {
  activityType: string;
  placeName: string;
  neighborhood: string;
  address?: string;
  when: string;
  groupSize: number;
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// The human-readable plan details Ora sends. Email and SMS share this body.
export function buildPlanMessage(d: PlanDetails): { subject: string; text: string } {
  const text = [
    "You're in. Here are your plan details:",
    "",
    cap(d.activityType),
    `${d.placeName} · ${d.neighborhood}`,
    d.address ?? "",
    d.when,
    "",
    `You'll be with ${d.groupSize} others Ora picked for you. No prep, just show up.`,
    "Ora will message you if anything changes.",
  ]
    .filter((line, i, arr) => line !== "" || (arr[i - 1] ?? "") !== "") // collapse doubled blanks
    .join("\n");
  return { subject: `Your Aura plan: ${cap(d.activityType)}`, text };
}

// Email via Resend's REST API (no SDK needed). Returns false when unconfigured
// or on failure, so callers can report delivery honestly.
export async function sendPlanEmail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "Aura <onboarding@resend.dev>";
  if (!key || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// SMS placeholder: no provider wired yet (Twilio/MessageBird/etc). Logs intent
// and returns false so the caller knows it wasn't delivered.
export async function sendPlanSms(to: string, text: string): Promise<boolean> {
  if (!to) return false;
  console.log(`[sms:stub] -> ${to}: ${text.slice(0, 80)}`);
  return false;
}
