import { writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { openai, MODELS } from "../lib/openai";
import { embedBatch } from "../lib/embed";
import type { Place } from "../types";

// One LLM call generates a structured JSON list of Berlin venues spread across
// neighborhoods + activity types. Then we batch-embed the descriptions.

const PROMPT = `Generate exactly 35 Berlin venues that fit a social-matching app for new-to-Berlin
expats and young professionals.

Each venue must:
- Be a real Berlin venue OR plausibly real (specific names, real neighborhoods, Berlin-authentic).
- Slot into one or more of these activity types:
  boulder gym, climbing crag, dinner party / restaurant, gallery / art opening,
  techno club / electronic music, jazz bar / live music, cafe (chill conversation),
  cafe-with-laptop / coworking, park / lake / outdoor, yoga / wellness studio,
  sports bar / pub, brunch spot.
- Have a non-generic 2-3 sentence description that captures the actual vibe and crowd
  ("creative crowd, low-key Sunday brunch, no laptops", not "great atmosphere").

Spread across these neighborhoods (at least 2 venues each):
Kreuzberg, Mitte, Friedrichshain, Neukölln, Prenzlauer Berg, Wedding, Charlottenburg,
Schöneberg, Tempelhof.

Output JSON: { "places": [ {place}, {place}, ... ] }
Each place:
{
  "name": string,
  "type": "cafe" | "bar" | "club" | "gallery" | "park" | "gym" | "venue" | "other",
  "neighborhood": string,
  "activityTypeTags": string[],   // 1-3 of the activity types above, normalized
  "vibeTags": string[],           // 2-4 short tags like "low-key", "creative crowd", "sunday afternoons"
  "description": string
}`;

interface RawPlace {
  name: string;
  type: Place["type"];
  neighborhood: string;
  activityTypeTags: string[];
  vibeTags: string[];
  description: string;
}

async function main() {
  console.log("→ generating Berlin venues via LLM...");
  const r = await openai.chat.completions.create({
    model: MODELS.chatLarge,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate authentic Berlin venue data for a social-matching app. Be specific, never generic.",
      },
      { role: "user", content: PROMPT },
    ],
  });

  const raw = r.choices[0].message.content;
  if (!raw) throw new Error("empty LLM response");
  const parsed = JSON.parse(raw) as { places: RawPlace[] };
  const rawPlaces = parsed.places;
  console.log(`✓ got ${rawPlaces.length} venues`);

  console.log("→ embedding venue descriptions...");
  const texts = rawPlaces.map(
    (p) =>
      `${p.name}. ${p.neighborhood}. ${p.activityTypeTags.join(", ")}. ${p.vibeTags.join(", ")}. ${p.description}`
  );
  const embeddings = await embedBatch(texts);
  console.log(`✓ embedded ${embeddings.length} descriptions`);

  const places: Place[] = rawPlaces.map((p, i) => ({
    id: randomUUID(),
    name: p.name,
    type: p.type,
    neighborhood: p.neighborhood,
    activityTypeTags: p.activityTypeTags,
    vibeTags: p.vibeTags,
    description: p.description,
    embedding: embeddings[i],
  }));

  mkdirSync("data", { recursive: true });
  writeFileSync("data/places.json", JSON.stringify(places, null, 2));
  console.log(`✓ wrote data/places.json (${places.length} venues)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
