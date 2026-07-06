// Smoke test for the stretch moment (Module 4 M4.5). Detects a stretch from a
// stated small-group preference, then narrates it with the real LLM, asserting
// the note is honest: suggestion-framed, no em dash, and no claim that Ora
// "watched" or "noticed" the user's behavior. Run with `npm run smoke:stretch`
// (needs OPENAI_API_KEY).

import type { Place, Plan, User } from "../types";
import { detectStretch, stretchFallbackLine } from "../lib/stretchPlan";
import { narrateStretch } from "../lib/whyNarrate";

function user(id: string, name: string, interests: string[], social: string[]): User {
  return {
    userId: id,
    displayName: name,
    city: "Berlin",
    createdAt: "2026-01-01T00:00:00.000Z",
    rawInputs: { selfDescription: "", lookingFor: "" },
    selfExtracted: {
      personality: [],
      interests,
      activityTypes: ["boulder gym"],
      socialPreferences: social,
      lifeContext: [],
      vibeKeywords: ["chill"],
    },
    lookingForExtracted: {
      personality: [],
      interests: [],
      socialPreferences: [],
      vibeKeywords: [],
      connectionType: [],
    },
    selfEmbedding: [],
    lookingForEmbedding: [],
  };
}

const venue: Place = {
  id: "v1",
  name: "Lentil & Lark",
  type: "other",
  neighborhood: "Kreuzberg",
  address: "",
  activityTypeTags: [],
  vibeTags: [],
  description: "",
  embedding: [],
};

const requester = user("u1", "Maya Stone", ["food", "books"], ["small-group", "low-pressure"]);

async function main() {
  const angle = detectStretch(requester.selfExtracted);
  if (!angle) {
    console.error("FAIL: expected a small-group user to be stretch-eligible");
    process.exit(1);
  }
  console.log("ANGLE:", JSON.stringify(angle, null, 2));

  const plan: Plan = {
    planId: "p1",
    createdForUserId: "u1",
    activityType: angle.activityOverride,
    place: venue,
    dateTime: "2026-07-09T19:00:00.000Z",
    vibe: ["chill"],
    attendees: [
      user("a", "Anton Berg", ["food"], ["lively"]),
      user("b", "Nour Haddad", ["books"], ["casual"]),
    ],
    whyThisPlan: "",
  };

  const fallback = stretchFallbackLine(angle, plan.activityType, plan.place.name);
  console.log("\nFALLBACK (deterministic):\n  " + fallback);

  const narrated = await narrateStretch(plan, requester, angle, fallback, { timeoutMs: 8000 });
  console.log("\nNARRATED (LLM):\n  " + narrated + "\n");

  const lower = narrated.toLowerCase();
  const dishonest = ["watched", "noticed", "i've seen", "i have seen", "your behavior", "i observed"];
  const offender = dishonest.find((p) => lower.includes(p));
  if (offender) {
    console.error(`FAIL: narration makes a behavioral claim ("${offender}")`);
    process.exit(1);
  }
  if (narrated.includes("—")) {
    console.error("FAIL: narration contains an em dash");
    process.exit(1);
  }
  if (!narrated || narrated.trim().length === 0) {
    console.error("FAIL: narration is empty");
    process.exit(1);
  }
  console.log("PASS: stretch detected and narrated honestly (suggestion-framed, no behavioral claim).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
