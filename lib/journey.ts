// Crew-journey helpers. Pure logic (DB reads live in the API route), unit-tested.

export const JOURNEY_TOTAL = 5;

// Which activity the user is on: the number of confirmed plans, capped at the
// 5-activity journey length. 0 = not started, 5 = crew formed.
export function journeyStep(confirmedPlanCount: number): number {
  if (!Number.isFinite(confirmedPlanCount) || confirmedPlanCount < 0) return 0;
  return Math.min(JOURNEY_TOTAL, Math.floor(confirmedPlanCount));
}

// Distinct crew members (other people) met across the journey, most-recent
// first, capped for display. Excludes the user themselves.
export function dedupeCrew(
  members: { id: string; name: string }[],
  selfId: string,
  limit = 4,
): { id: string; name: string }[] {
  const seen = new Set<string>([selfId]);
  const out: { id: string; name: string }[] = [];
  for (const m of members) {
    if (!m.id || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
    if (out.length >= limit) break;
  }
  return out;
}
