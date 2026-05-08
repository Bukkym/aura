import { writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { openai, MODELS } from "../lib/openai";
import { embedBatch } from "../lib/embed";
import type {
  User,
  SelfExtracted,
  LookingForExtracted,
  ConnectionType,
} from "../types";

// 7 archetypes × 5 batches × 5 users = 175 users.
// Per `/technical/03-archetypes.md`: archetype is a SOCIAL MODE, not an interest set.
// Within each archetype, users vary across age, Berlin tenure, social style, and specificity.

const USERS_PER_BATCH = 5;
const BATCHES_PER_ARCHETYPE = 5;
const EMBED_BATCH_SIZE = 100;

interface ArchetypeSpec {
  id: string;
  name: string;
  socialMode: string;
  typicalActivities: string;
  typicalInterests: string;
  typicalSocialStyle: string;
  examplesOfSelfDescription: string;
  examplesOfLookingFor: string;
}

const ARCHETYPES: ArchetypeSpec[] = [
  {
    id: "ambitious-creators",
    name: "Ambitious Creators",
    socialMode:
      "Build mode. Their social life is shaped by what they're making — startups, side projects, art, writing, design, music with output. Talking shop is comfort, not work-life leakage.",
    typicalActivities:
      "cafe-with-laptop sessions, founder dinners, conference meet-ups, gallery openings of friends, indie cinema, occasional climbing or running to recharge",
    typicalInterests:
      "startups, indie products, design, AI, philosophy, books, specific subcultures (cycling, climbing, electronic music), entrepreneurship, niche tech",
    typicalSocialStyle:
      "small-group, opinion-rich, no small talk, intellectually curious, comfortable working weekends",
    examplesOfSelfDescription:
      "I moved to Berlin from Lisbon nine months ago to build my SaaS. I cycle to Factory most days and would rather have one good 3-hour conversation than five superficial ones.",
    examplesOfLookingFor:
      "Other builders or makers — people working on something they actually care about. Don't need them to be in tech, but they should get the build life. Chill, ambitious, not performative.",
  },
  {
    id: "cultural-explorers",
    name: "Cultural Explorers",
    socialMode:
      "Curious-mind mode. Engage with the city's art, ideas, food, and music as the primary social activity. Show up to the talk, the opening, the new restaurant.",
    typicalActivities:
      "gallery openings, indie cinema, theater, philosophy reading groups, food-as-experience dinners, live music attendance, museum afternoons",
    typicalInterests:
      "contemporary art, philosophy, indie film, literary fiction, natural wine, food scene, jazz, classical, political theory, urban history",
    typicalSocialStyle:
      "thoughtful, opinionated but not pretentious, willing to do the thing not just talk about it, prefers quality conversation",
    examplesOfSelfDescription:
      "I read a lot, mostly fiction and political theory, and I go to a gallery opening or a film screening basically every week. My favorite thing is a long dinner where the conversation goes somewhere unexpected.",
    examplesOfLookingFor:
      "People who actually engage with culture, not just consume it. Opinions are good. I want someone I can text about a Volksbühne show and have them say yes.",
  },
  {
    id: "scene-nightlife",
    name: "Scene & Nightlife",
    socialMode:
      "Going-out mode. Music and dance as a primary social identity. Late nights, hedonistic but curated, the after and sometimes the after-after.",
    typicalActivities:
      "techno clubs (Berghain, ://about blank, Sisyphos, Watergate), warehouse parties, queer parties, electronic music shows, Sunday brunches that start at 4pm, late dinners",
    typicalInterests:
      "techno, electronic music, club culture, fashion, art-adjacent scenes, queer culture, vinyl, DJ-ing as a hobby",
    typicalSocialStyle:
      "high-energy when going out, holds space on a dance floor without being chaotic, can do the night and the day after, no judgment",
    examplesOfSelfDescription:
      "I've been in Berlin three years. Most weekends I'm out. I've done the Berghain thing more times than I can count but I also love the smaller queer parties. Sunday is for slow brunches with the same handful of people.",
    examplesOfLookingFor:
      "People who get the scene without making it their whole identity. Chill on Sunday, present on Saturday night, kind during the week.",
  },
  {
    id: "outdoor-active",
    name: "Outdoor & Active",
    socialMode:
      "Movement mode. Body in motion as the primary social glue — cycling, climbing, hiking, lakes, running, casual recreational sports.",
    typicalActivities:
      "boulder gym sessions, weekend hikes outside Berlin, lake days at Schlachtensee or Müggelsee, cycling tours, running clubs, climbing crags, weekend camping",
    typicalInterests:
      "climbing, cycling, trail running, hiking, swimming, snowboarding, environment, nutrition, gear, the outdoors as identity",
    typicalSocialStyle:
      "spontaneous, energetic, low-maintenance, doesn't flake, says yes to a Thursday lake plan",
    examplesOfSelfDescription:
      "I moved here for the bouldering scene. I'm at Boulderwelt or Berta four times a week, and on weekends I'm usually at a lake or doing something outside the city. I'd rather be outside than in.",
    examplesOfLookingFor:
      "People who actually do stuff outdoors. I can deal with skill-level differences, just want someone who doesn't cancel last minute when the weather is good.",
  },
  {
    id: "wellness-inner-work",
    name: "Wellness & Inner-Work",
    socialMode:
      "Reflective mode. Yoga, somatics, breathwork, therapy-fluent, retreats, sober-curious, contemplative practice as core to how they live.",
    typicalActivities:
      "yoga studios (Spirit, Flow), Vipassana retreats, ecstatic dance, breathwork circles, plant-medicine adjacent gatherings, slow mornings, intentional dinners",
    typicalInterests:
      "yoga, meditation, somatics, polyvagal theory, attachment styles, sustainable living, plant medicine, herbalism, nervous system regulation",
    typicalSocialStyle:
      "emotionally present, willing to go deep, slow-paced, often sober or sober-curious, doesn't flinch at vulnerability",
    examplesOfSelfDescription:
      "I moved to Berlin a year ago after a long burnout. I do yoga most mornings, see my therapist every two weeks, and most of my closest friendships were built in retreat settings. I don't really drink anymore.",
    examplesOfLookingFor:
      "People who can hold space and aren't allergic to feelings. Doesn't need to be deep all the time but I want someone I can actually be honest with.",
  },
  {
    id: "cozy-connectors",
    name: "Cozy Connectors",
    socialMode:
      "Hearth mode. Small circles, dinner parties, board games, neighborhood regulars, slow weekends. Depth over breadth, low-key over scene.",
    typicalActivities:
      "hosting dinners, board game nights, brunches with the same 4 people, neighborhood walks, neighborhood cafes, occasional museum afternoons",
    typicalInterests:
      "cooking, baking, board games, books, slow living, gardening, local cafes, low-key indie music, vinyl",
    typicalSocialStyle:
      "warm, consistent, dependable, prefers depth over breadth, will remember your birthday, not into clubbing or scene-y stuff",
    examplesOfSelfDescription:
      "I've been in Berlin five years. I host a dinner party most months and most of my closest friendships are people I see at least every two weeks. I don't really go out — I'd rather have you over.",
    examplesOfLookingFor:
      "People who actually show up. Reliability matters more than flash. I want a small group I can build a real shared life with, not a list of acquaintances.",
  },
  {
    id: "sports-crew",
    name: "Sports & Crew",
    socialMode:
      "Team-and-spectator mode. Shared sports passion + game-day culture as primary social glue. Pickup leagues, watch parties, sports-bar regulars.",
    typicalActivities:
      "rec league soccer / hockey / kickball / padel, sports bar watch parties, fantasy league nights, BVG to Olympia stadium for games, rooftop watch parties for big tournaments",
    typicalInterests:
      "specific sports (football / basketball / hockey / NFL / Formula 1), fantasy leagues, sports betting, sports media, gym, padel, beer leagues",
    typicalSocialStyle:
      "tribal, loyal, shows up for game day, comfortable in bar/group settings, banter-heavy",
    examplesOfSelfDescription:
      "I'm Canadian, in Berlin for a job. Most of my best friendships back home formed around sports — beer leagues, watching games together, fantasy. Trying to find that here, which is harder than I thought.",
    examplesOfLookingFor:
      "People who actually care about a sport. I don't need them to like the same teams, just to want to watch the game and grab a beer.",
  },
];

interface RawUser {
  displayName: string;
  ageMin: number;
  ageMax: number;
  rawInputs: { selfDescription: string; lookingFor: string };
  selfExtracted: SelfExtracted;
  lookingForExtracted: LookingForExtracted;
}

function buildPrompt(archetype: ArchetypeSpec, count: number): string {
  return `Generate ${count} DISTINCT users in the "${archetype.name}" archetype for a social-matching app in Berlin.

ARCHETYPE — what these users share:
${archetype.socialMode}

Typical activities for this archetype: ${archetype.typicalActivities}
Typical interests: ${archetype.typicalInterests}
Typical social style: ${archetype.typicalSocialStyle}

Example self-description (style reference):
"${archetype.examplesOfSelfDescription}"

Example looking-for (style reference):
"${archetype.examplesOfLookingFor}"

DIVERSITY — vary the ${count} users along:
- Age: between 24 and 42
- Berlin tenure: just arrived (under 6 months), settled (6 months – 2 years), long-time (2+ years)
- Specificity of looking-for: some very particular about who they want to meet, some open
- Concrete interests + activities: they share a social mode, but their hobbies and what they care about should differ
- Introvert / extrovert split: not everyone in this archetype has the same energy

Output JSON: { "users": [ {user}, ... ] }
Each user:
{
  "displayName": "first name only — international mix appropriate to Berlin",
  "ageMin": number,
  "ageMax": number,
  "rawInputs": {
    "selfDescription": "1-2 paragraph speech-like first-person description, sounds like real spoken language",
    "lookingFor": "1 paragraph speech-like first-person description of who they want to meet"
  },
  "selfExtracted": {
    "personality": ["3-5 short tags like 'chill', 'ambitious', 'introverted'"],
    "interests": ["3-6 topical interest tags like 'startups', 'philosophy', 'natural wine'"],
    "activityTypes": ["3-5 concrete activity tags like 'boulder gym', 'gallery openings', 'dinner parties' — should align with the archetype's typical activities"],
    "socialPreferences": ["2-3 tags like 'small-group', 'low-pressure', 'spontaneous'"],
    "lifeContext": ["2-3 tags like 'new to Berlin', 'remote worker', 'expat'"],
    "vibeKeywords": ["0-3 catch-all tags that didn't fit elsewhere"],
    "availability": ["1-2 tags like 'weekends', 'weekday evenings'"],
    "budget": "low" | "mid" | "high" | "any"
  },
  "lookingForExtracted": {
    "personality": ["traits they want in others, 2-4 tags"],
    "interests": ["interests they want shared, 1-3 tags"],
    "socialPreferences": ["1-2 tags"],
    "vibeKeywords": ["0-2 tags"],
    "connectionType": ["1-3 of: 'close-friendships', 'social-circle', 'activity-buddies', 'new-city-support'"]
  }
}

Tags must be lowercase, kebab-case-or-short-phrase, normalized (e.g. "small-group" not "Small Group").
ConnectionType must use exact strings: close-friendships, social-circle, activity-buddies, new-city-support.`;
}

async function generateBatch(
  archetype: ArchetypeSpec,
  count: number
): Promise<RawUser[]> {
  const r = await openai.chat.completions.create({
    model: MODELS.chatLarge,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate authentic, varied user profiles for a social-matching app. Each user is distinct — no copy-paste. Voice should sound like real spoken language, not AI prose.",
      },
      { role: "user", content: buildPrompt(archetype, count) },
    ],
  });
  const raw = r.choices[0].message.content;
  if (!raw) throw new Error("empty response");
  const parsed = JSON.parse(raw) as { users: RawUser[] };
  return parsed.users;
}

function stringifyForEmbed(
  layer: SelfExtracted | LookingForExtracted | undefined | null
): string {
  if (!layer) return "";
  return Object.entries(layer)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: ${v.join(", ")}`;
      return `${k}: ${v}`;
    })
    .join(". ");
}

function isValidRawUser(u: RawUser): boolean {
  return (
    !!u &&
    typeof u.displayName === "string" &&
    !!u.rawInputs?.selfDescription &&
    !!u.rawInputs?.lookingFor &&
    !!u.selfExtracted &&
    Array.isArray(u.selfExtracted.personality) &&
    Array.isArray(u.selfExtracted.interests) &&
    Array.isArray(u.selfExtracted.activityTypes) &&
    !!u.lookingForExtracted &&
    Array.isArray(u.lookingForExtracted.personality) &&
    Array.isArray(u.lookingForExtracted.connectionType)
  );
}

async function main() {
  console.log(
    `→ generating ${ARCHETYPES.length} archetypes × ${BATCHES_PER_ARCHETYPE} batches × ${USERS_PER_BATCH} users = ${ARCHETYPES.length * BATCHES_PER_ARCHETYPE * USERS_PER_BATCH} target users`
  );

  const taggedRawUsers: { archetypeId: string; user: RawUser }[] = [];

  for (const archetype of ARCHETYPES) {
    console.log(`\n  ${archetype.name}:`);
    for (let i = 0; i < BATCHES_PER_ARCHETYPE; i++) {
      try {
        const batch = await generateBatch(archetype, USERS_PER_BATCH);
        console.log(`    batch ${i + 1}/${BATCHES_PER_ARCHETYPE}: +${batch.length} users`);
        for (const user of batch) {
          taggedRawUsers.push({ archetypeId: archetype.id, user });
        }
      } catch (e) {
        console.warn(`    batch ${i + 1} failed, skipping:`, (e as Error).message);
      }
    }
  }

  console.log(`\n✓ generated ${taggedRawUsers.length} users total`);

  const validRawUsers = taggedRawUsers.filter(({ user }) => isValidRawUser(user));
  const droppedCount = taggedRawUsers.length - validRawUsers.length;
  if (droppedCount > 0) {
    console.warn(`  dropped ${droppedCount} malformed user(s) before embedding`);
  }

  // Embed self + lookingFor in batches.
  const allTexts: string[] = [];
  for (const { user } of validRawUsers) {
    allTexts.push(stringifyForEmbed(user.selfExtracted));
    allTexts.push(stringifyForEmbed(user.lookingForExtracted));
  }

  console.log(`→ embedding ${allTexts.length} text rows in chunks of ${EMBED_BATCH_SIZE}...`);
  const allEmbeds: number[][] = [];
  for (let i = 0; i < allTexts.length; i += EMBED_BATCH_SIZE) {
    const chunk = allTexts.slice(i, i + EMBED_BATCH_SIZE);
    const embeds = await embedBatch(chunk);
    allEmbeds.push(...embeds);
    console.log(`  embedded ${Math.min(i + EMBED_BATCH_SIZE, allTexts.length)}/${allTexts.length}`);
  }

  const now = new Date().toISOString();
  const users: User[] = validRawUsers.map(({ archetypeId, user }, i) => ({
    userId: randomUUID(),
    displayName: user.displayName,
    city: "Berlin" as const,
    ageRange: { min: user.ageMin, max: user.ageMax },
    createdAt: now,
    rawInputs: user.rawInputs,
    selfExtracted: user.selfExtracted,
    lookingForExtracted: {
      ...user.lookingForExtracted,
      connectionType: (user.lookingForExtracted
        .connectionType as ConnectionType[]) ?? [],
    },
    selfEmbedding: allEmbeds[2 * i],
    lookingForEmbedding: allEmbeds[2 * i + 1],
    _archetype: archetypeId,
  }));

  mkdirSync("data", { recursive: true });
  writeFileSync("data/users.json", JSON.stringify(users, null, 2));
  console.log(`\n✓ wrote data/users.json (${users.length} users)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
