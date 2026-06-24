import { describe, it, expect } from "vitest";
import { statusFromRow, planSummaryFromRow, splitByTime, profileExists, type PlanRow, type PlaceLite } from "../plans";
import type { PlanSummary } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Minimal stub of the supabase query chain profileExists walks:
// from("users").select("id").eq("auth_user_id", id).maybeSingle()
function stubSb(result: { data: unknown; error: unknown }): SupabaseClient {
  const maybeSingle = () => Promise.resolve(result);
  const eq = () => ({ maybeSingle });
  const select = () => ({ eq });
  const from = () => ({ select });
  return { from } as unknown as SupabaseClient;
}

const PLACE: PlaceLite = { name: "Otto", neighborhood: "Neukölln", type: "cafe" };

const names = new Map<string, string>([
  ["u1", "Sofia"],
  ["u2", "Anton"],
  ["u3", "Nour"],
  ["u4", "Milo"],
]);

function row(overrides: Partial<PlanRow> = {}): PlanRow {
  return {
    id: "p1",
    activity_type: "boulder gym",
    date_time: "2026-06-20T09:00:00.000Z",
    vibe: ["chill", "ambitious"],
    attendee_user_ids: ["u1", "u2", "u3", "u4"],
    confirmed_at: null,
    ...overrides,
  };
}

describe("statusFromRow()", () => {
  it("is ready when confirmed_at is absent", () => {
    expect(statusFromRow(null)).toBe("ready");
    expect(statusFromRow(undefined)).toBe("ready");
  });
  it("is confirmed when confirmed_at is present", () => {
    expect(statusFromRow("2026-06-16T10:00:00.000Z")).toBe("confirmed");
  });
  it("is declined when declined_at is present, regardless of confirmed_at", () => {
    expect(statusFromRow(null, "2026-06-17T10:00:00.000Z")).toBe("declined");
    expect(statusFromRow("2026-06-16T10:00:00.000Z", "2026-06-17T10:00:00.000Z")).toBe("declined");
  });
});

describe("planSummaryFromRow()", () => {
  it("maps the card-level fields and derives status", () => {
    const s = planSummaryFromRow(row(), PLACE, names);
    expect(s.id).toBe("p1");
    expect(s.activityType).toBe("boulder gym");
    expect(s.place).toEqual({ name: "Otto", neighborhood: "Neukölln", type: "cafe" });
    expect(s.dateTime).toBe("2026-06-20T09:00:00.000Z");
    expect(s.vibe).toEqual(["chill", "ambitious"]);
    expect(s.status).toBe("ready");
  });

  it("counts all attendees but only previews the first few resolved names", () => {
    const s = planSummaryFromRow(row(), PLACE, names, 3);
    expect(s.attendeeCount).toBe(4);
    expect(s.attendees).toEqual([
      { userId: "u1", displayName: "Sofia" },
      { userId: "u2", displayName: "Anton" },
      { userId: "u3", displayName: "Nour" },
    ]);
  });

  it("drops attendee ids with no resolved name", () => {
    const s = planSummaryFromRow(row({ attendee_user_ids: ["u1", "missing", "u2"] }), PLACE, names);
    expect(s.attendeeCount).toBe(3);
    expect(s.attendees.map((a) => a.userId)).toEqual(["u1", "u2"]);
  });

  it("derives confirmed status from confirmed_at", () => {
    const s = planSummaryFromRow(row({ confirmed_at: "2026-06-16T10:00:00.000Z" }), PLACE, names);
    expect(s.status).toBe("confirmed");
  });

  it("derives declined status from declined_at", () => {
    const s = planSummaryFromRow(row({ declined_at: "2026-06-17T10:00:00.000Z" }), PLACE, names);
    expect(s.status).toBe("declined");
  });

  it("tolerates a null vibe array", () => {
    const s = planSummaryFromRow(row({ vibe: null as unknown as string[] }), PLACE, names);
    expect(s.vibe).toEqual([]);
  });
});

describe("profileExists()", () => {
  it("is true when a profile row is found", async () => {
    const sb = stubSb({ data: { id: "u1" }, error: null });
    expect(await profileExists(sb, "auth-1")).toBe(true);
  });

  it("is false when no profile row exists", async () => {
    const sb = stubSb({ data: null, error: null });
    expect(await profileExists(sb, "auth-1")).toBe(false);
  });

  it("throws when the lookup errors, so the caller can decide the fallback", async () => {
    const sb = stubSb({ data: null, error: { message: "boom" } });
    await expect(profileExists(sb, "auth-1")).rejects.toThrow("Profile lookup failed: boom");
  });
});

describe("splitByTime()", () => {
  const now = "2026-06-16T12:00:00.000Z";

  function summary(id: string, dateTime: string): PlanSummary {
    return {
      id,
      activityType: "x",
      place: { name: "p", neighborhood: "n", type: "cafe" },
      dateTime,
      vibe: [],
      attendeeCount: 0,
      attendees: [],
      status: "ready",
    };
  }

  it("partitions on now", () => {
    const { upcoming, past } = splitByTime(
      [
        summary("future", "2026-06-20T09:00:00.000Z"),
        summary("past", "2026-06-10T09:00:00.000Z"),
      ],
      now,
    );
    expect(upcoming.map((s) => s.id)).toEqual(["future"]);
    expect(past.map((s) => s.id)).toEqual(["past"]);
  });

  it("sorts upcoming soonest-first and past most-recent-first", () => {
    const { upcoming, past } = splitByTime(
      [
        summary("u-late", "2026-06-25T09:00:00.000Z"),
        summary("u-soon", "2026-06-18T09:00:00.000Z"),
        summary("p-old", "2026-06-01T09:00:00.000Z"),
        summary("p-recent", "2026-06-14T09:00:00.000Z"),
      ],
      now,
    );
    expect(upcoming.map((s) => s.id)).toEqual(["u-soon", "u-late"]);
    expect(past.map((s) => s.id)).toEqual(["p-recent", "p-old"]);
  });

  it("treats a plan exactly at now as upcoming", () => {
    const { upcoming } = splitByTime([summary("edge", now)], now);
    expect(upcoming.map((s) => s.id)).toEqual(["edge"]);
  });
});
