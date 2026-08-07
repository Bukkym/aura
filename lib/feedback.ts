// Post-plan feedback logic. Pure transform from the rater's per-attendee picks
// into directional plan_feedback rows. DB writes live in the API route
// (app/api/plan/feedback) per the project's data-access rules; this stays pure
// and unit-tested.
//
// `picks` maps a ratee's users.id to whether the rater would meet them again.

export interface FeedbackRow {
  plan_id: string;
  rater_id: string;
  ratee_id: string;
  would_meet_again: boolean;
}

export function buildFeedbackRows(
  planId: string,
  raterId: string,
  picks: Record<string, boolean>,
): FeedbackRow[] {
  return Object.entries(picks)
    .filter(([rateeId]) => Boolean(rateeId) && rateeId !== raterId)
    .map(([rateeId, wants]) => ({
      plan_id: planId,
      rater_id: raterId,
      ratee_id: rateeId,
      would_meet_again: Boolean(wants),
    }));
}
