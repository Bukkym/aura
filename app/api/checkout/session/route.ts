import { NextResponse } from "next/server";

// POST /api/checkout/session
// Body: { kind?: "single" | "journey" }
// Creates a Stripe Checkout Session when STRIPE_SECRET_KEY is set; otherwise
// returns { skipped: true } so the flow proceeds without charging (payment is
// the last thing to switch on). Uses Stripe's REST API, so no SDK dependency.
export async function POST(req: Request) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    const body = (await req.json().catch(() => ({}))) as { kind?: unknown };
    const kind = body?.kind === "journey" ? "journey" : "single";

    if (!key) {
      // Payment not configured yet — the client proceeds without charging.
      return NextResponse.json({ skipped: true });
    }

    const origin = req.headers.get("origin") ?? "http://localhost:3000";
    const amount = kind === "journey" ? 7000 : 1800; // cents, CAD (placeholder pricing)
    const name = kind === "journey" ? "Aura · 5-plan journey" : "Aura · this plan";

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${origin}/home`);
    params.set("cancel_url", `${origin}/plan`);
    params.append("line_items[0][quantity]", "1");
    params.append("line_items[0][price_data][currency]", "cad");
    params.append("line_items[0][price_data][unit_amount]", String(amount));
    params.append("line_items[0][price_data][product_data][name]", name);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
    if (!res.ok) {
      return NextResponse.json({ error: data?.error?.message ?? "Stripe error" }, { status: 500 });
    }
    return NextResponse.json({ url: data.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
