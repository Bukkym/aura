import { NextResponse } from "next/server";

// GET /api/health
//
// Lightweight health check for deployment monitoring. Returns 200 with a small
// status payload so an uptime monitor (or the CI smoke step) can confirm the
// app is serving. Kept dependency-free on purpose: it should answer even if
// the database or other services are degraded, so a 200 here means "the app is
// up", not "everything downstream is healthy".
//
// Always dynamic so it reflects the live process, never a cached build artifact.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      status: "ok",
      service: "aura",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "error" },
      { status: 500 },
    );
  }
}
