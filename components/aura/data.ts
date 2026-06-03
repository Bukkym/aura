// Sample content for the aura full-flow recreation. Mirrors the prototype's seed
// data (Sofia's profile, the gallery-hop Plan, the long-table supper). Wiring
// these to the real models (data/users.json, data/places.json, the deterministic
// matching engine) is the follow-up; this keeps the screens pixel-faithful now.

export const mono = 'ui-monospace, "SF Mono", "Geist Mono", Menlo, monospace';

export interface Person {
  id: string;
  name: string;
  fit: string;
  detail: [string, string][];
  ora: string;
}

export interface PlanContent {
  activity: string;
  venue: string;
  hood: string;
  when: string;
  vibes: string[];
  why: string;
}

export const PLAN: PlanContent = {
  activity: "GALLERY HOP + NATURAL WINE",
  venue: "Otto Bar",
  hood: "Kreuzberg",
  when: "This Friday · 7:30pm",
  vibes: ["creative crowd", "low-key", "stays late"],
  why: "You light up around art and ideas, and you asked for people who go deep without trying too hard. This group has that. Most of them stay out talking long after the wine is gone.",
};

export const PEOPLE: Person[] = [
  {
    id: "jonas-b",
    name: "Jonas",
    fit: "building a climbing app, collects techno records",
    detail: [
      ["Both into", "startups, vinyl, late nights"],
      ["You'd both show up for", "gallery openings, cafe work sessions"],
      ["The energy you described", "curious, low-key, ambitious"],
    ],
    ora: "I think you two end up talking past midnight.",
  },
  {
    id: "mira-k",
    name: "Mira",
    fit: "curates a gallery in Kreuzberg, warm and unhurried",
    detail: [
      ["Both into", "art, galleries, vinyl"],
      ["You'd both show up for", "gallery openings, slow dinners"],
      ["The energy you described", "warm, curious"],
    ],
    ora: "She knows every opening worth going to.",
  },
  {
    id: "lena-w",
    name: "Lena",
    fit: "DJs house nights, new to Berlin like you",
    detail: [
      ["Both into", "music, late nights"],
      ["You'd both show up for", "vinyl pop-ups, dancing"],
      ["The energy you described", "spontaneous, open"],
    ],
    ora: "Both finding your footing here at the same time.",
  },
  {
    id: "theo-r",
    name: "Theo",
    fit: "philosophy PhD who fell for startups",
    detail: [
      ["Both into", "ideas, startups, tech ethics"],
      ["You'd both show up for", "long cafe talks"],
      ["The energy you described", "sharp, curious"],
    ],
    ora: "Exactly the deep-dive conversation you described.",
  },
  {
    id: "yara-s",
    name: "Yara",
    fit: "ceramicist, hosts vinyl-and-wine evenings",
    detail: [
      ["Both into", "making things, vinyl, wine"],
      ["You'd both show up for", "studio evenings, openings"],
      ["The energy you described", "creative, warm"],
    ],
    ora: "Her place is where these nights usually continue.",
  },
  {
    id: "anton-d",
    name: "Anton",
    fit: "product designer, quiet until he isn't",
    detail: [
      ["Both into", "design, startups, music"],
      ["You'd both show up for", "gallery hops, listening sessions"],
      ["The energy you described", "low-key, thoughtful"],
    ],
    ora: "Slow to warm up, then you can't stop him.",
  },
];

// Short role condensations for the line-up treatments.
export const ROLE: Record<string, string> = {
  "jonas-b": "Climbing-app founder",
  "mira-k": "Gallery curator",
  "lena-w": "House DJ",
  "theo-r": "Philosophy PhD",
  "yara-s": "Ceramicist",
  "anton-d": "Product designer",
};

// Who has accepted Ora's intro vs. who's still pending. "You" hasn't replied yet.
export const RSVP: Record<string, "confirmed" | "awaiting"> = {
  "jonas-b": "confirmed",
  "mira-k": "confirmed",
  "yara-s": "confirmed",
  "lena-w": "awaiting",
  "theo-r": "awaiting",
  "anton-d": "awaiting",
};

export const READY_ATTENDEES = ["jonas-b", "mira-k", "yara-s", "lena-w", "theo-r", "anton-d"];

export const DEFAULT_INVITE =
  "Hey, Ora here. You've all been picked for a Plan because of how you click. Gallery hop + natural wine this Friday, 7:30pm, Otto Bar in Kreuzberg. No prep needed, just show up. See you there.";

// ── The stretched supper: a bigger table than this person usually takes ──
export const SUPPER: PlanContent & { id: string } = {
  id: "004",
  activity: "NOUR'S LONG-TABLE SUPPER",
  venue: "a back-room supper",
  hood: "Neukölln",
  when: "Next Thursday · 8pm",
  vibes: ["nine at the table", "cooked to order", "runs late"],
  why: "It is one long table, one menu, no choosing. Nour cooks, someone always brings records, and nobody leaves on time. Every seat is a person who goes deep the way you do. The size is the point: this is the loud, generous kind of night you never ask for and never want to end.",
};

export interface Guest {
  id: string;
  name: string;
  role: string;
  host?: boolean;
  ora?: string;
}

export const SUPPER_GUESTS: Guest[] = [
  { id: "nour-h", name: "Nour", role: "Hosts the supper, writes poetry", host: true, ora: "She built this table for people exactly like you." },
  { id: "jonas-b", name: "Jonas", role: "Climbing-app founder, collects techno" },
  { id: "kasia-r", name: "Kasia", role: "Runs a risograph zine press" },
  { id: "milo-t", name: "Milo", role: "Cooks the whole table, plays trumpet", ora: "He will pull you into the kitchen by nine." },
  { id: "mira-k", name: "Mira", role: "Curates a gallery in Kreuzberg" },
  { id: "dora-v", name: "Dora", role: "Documentary editor, never small-talks" },
  { id: "felix-a", name: "Felix", role: "Architect, terrible at small, great at big" },
  { id: "bea-l", name: "Bea", role: "Botanist turned florist" },
];

export interface PastPlan {
  id: string;
  activity: string;
  venue: string;
  hood: string;
  when: string;
  guests: string[];
  count: number;
  recap: string;
}

// History that establishes the "usual": small, intimate, three or four people.
export const PAST: PastPlan[] = [
  {
    id: "003",
    activity: "VINYL + NATURAL WINE",
    venue: "Yara's studio",
    hood: "Neukölln",
    when: "12 DAYS AGO",
    guests: ["yara-s", "anton-d", "theo-r"],
    count: 4,
    recap: "You closed the place down. Worth it.",
  },
  {
    id: "002",
    activity: "MORNING BOULDER SESSION",
    venue: "Boulderwelt",
    hood: "Friedrichshain",
    when: "3 WEEKS AGO",
    guests: ["jonas-b", "lena-w"],
    count: 3,
    recap: "Two of you, then coffee for an hour. Small on purpose.",
  },
];
