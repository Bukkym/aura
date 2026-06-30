// Smoke test for the LLM-narrated "why this plan" (Module 4 M4.2). Builds a
// fake plan, prints the deterministic template (the fallback) next to the real
// Claude narration, and confirms the narration is non-empty, em-dash-free, and
// not just the template. Run with `npm run smoke:why` (needs ANTHROPIC_API_KEY).

import type { Place, Plan, User } from "../types";
import { narrateWhy } from "../lib/whyNarrate";

function user(id: string, name: string, interests: string[], vibe: string[]): User {
  return {
    userId: id,
    displayName: name,
    city: "Berlin",
    createdAt: "2026-01-01T00:00:00.000Z",
    rawInputs: { selfDescription: "", lookingFor: "" },
    selfExtracted: {
      personality: [],
      interests,
      activityTypes: [],
      socialPreferences: [],
      lifeContext: [],
      vibeKeywords: vibe,
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
  name: "Ostbloc",
  type: "gym",
  neighborhood: "Friedrichshain",
  address: "",
  activityTypeTags: [],
  vibeTags: [],
  description: "",
  embedding: [],
};

const requester = user("u1", "Maya Stone", ["climbing", "design"], ["adventurous"]);
const plan: Plan = {
  planId: "p1",
  createdForUserId: "u1",
  activityType: "boulder gym",
  place: venue,
  dateTime: "2026-07-04T11:00:00.000Z",
  vibe: ["adventurous"],
  attendees: [
    user("a", "Anton Berg", ["climbing", "startups"], ["adventurous"]),
    user("b", "Nour Haddad", ["climbing", "techno"], ["adventurous"]),
  ],
  whyThisPlan:
    "Boulder gym at Ostbloc, Saturday morning, with 2 people Ora thought you'd enjoy.",
};

async function main() {
  const template = plan.whyThisPlan;
  console.log("TEMPLATE (fallback):\n  " + template + "\n");
  const narrated = await narrateWhy(plan, requester, { timeoutMs: 8000 });
  console.log("NARRATED (Claude):\n  " + narrated + "\n");

  if (!narrated || narrated.trim().length === 0) {
    console.error("FAIL: narration is empty");
    process.exit(1);
  }
  if (narrated.includes("—")) {
    console.error("FAIL: narration contains an em dash");
    process.exit(1);
  }
  if (narrated === template) {
    console.error("FAIL: narration fell back to the template (Claude unreachable?)");
    process.exit(1);
  }
  console.log("PASS: Claude produced a clean narration distinct from the template.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
