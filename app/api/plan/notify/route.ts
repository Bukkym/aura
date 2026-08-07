import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildPlanMessage, sendPlanEmail, sendPlanSms, type PlanDetails } from "@/lib/notify";

// POST /api/plan/notify
// Body: { phone?: string, details: PlanDetails }
// Saves the just-in-time phone number and sends the plan details to the
// authenticated user (email always; SMS when a provider is wired). Email goes
// to the server-derived auth email, so a client can only reach its own inbox.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { phone?: unknown; details?: Partial<PlanDetails> }
      | null;

    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const d = body?.details;
    if (!d || typeof d.activityType !== "string" || typeof d.placeName !== "string") {
      return NextResponse.json(
        { error: "details.activityType and details.placeName are required" },
        { status: 400 },
      );
    }

    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Save the phone (best-effort) for future notifications.
    if (phone) {
      const { error } = await sb.from("users").update({ phone }).eq("auth_user_id", user.id);
      if (error) {
        // Non-fatal: still try to deliver this plan's details.
        console.error("failed to save phone:", error.message);
      }
    }

    const { subject, text } = buildPlanMessage({
      activityType: d.activityType,
      placeName: d.placeName,
      neighborhood: typeof d.neighborhood === "string" ? d.neighborhood : "",
      address: typeof d.address === "string" ? d.address : undefined,
      when: typeof d.when === "string" ? d.when : "",
      groupSize: typeof d.groupSize === "number" ? d.groupSize : 0,
    });

    const emailed = user.email ? await sendPlanEmail(user.email, subject, text) : false;
    const texted = phone ? await sendPlanSms(phone, text) : false;

    return NextResponse.json({ ok: true, emailed, texted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
