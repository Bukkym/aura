// One-shot: re-locate the seed venues from Berlin to Toronto. Keeps id, type,
// activityTypeTags and vibeTags (matching relies on those), swaps name +
// neighborhood + address to a Toronto equivalent of the same kind, simplifies
// the description, and clears the Berlin embedding (nullable, unused by the
// deterministic matcher). Run: node scripts/toronto-venues.mjs
import { readFileSync, writeFileSync } from "node:fs";

const PATH = new URL("../data/places.json", import.meta.url);
const places = JSON.parse(readFileSync(PATH, "utf8"));

// Index-aligned Toronto equivalents (same type/vibe as the Berlin original).
const TO = [
  ["Basecamp Climbing", "The Junction", "1 Edwin Ave, Toronto, ON M6P 3Z5"],
  ["The Great Hall", "Queen West", "1087 Queen St W, Toronto, ON M6J 1H3"],
  ["Coda", "The Annex", "794 Bathurst St, Toronto, ON M5R 3G1"],
  ["Trinity Bellwoods Park", "Trinity Bellwoods", "790 Queen St W, Toronto, ON M6J 1G3"],
  ["Sam James Coffee Bar", "Harbord Village", "297 Harbord St, Toronto, ON M6G 1G7"],
  ["Bar Raval", "Little Italy", "505 College St, Toronto, ON M6G 1A4"],
  ["Art Gallery of Ontario", "Grange Park", "317 Dundas St W, Toronto, ON M5T 1G4"],
  ["Boxcar Social", "Riverside", "4 Boulton Ave, Toronto, ON M4M 2J5"],
  ["BarChef", "Queen West", "472 Queen St W, Toronto, ON M5V 2A9"],
  ["Bellwoods Brewery", "Ossington", "124 Ossington Ave, Toronto, ON M6J 2Z5"],
  ["St. Lawrence Market", "St. Lawrence", "93 Front St E, Toronto, ON M5E 1C3"],
  ["Body Blitz Spa East", "Corktown", "497 King St E, Toronto, ON M5A 1L9"],
  ["High Park", "High Park", "1873 Bloor St W, Toronto, ON M6R 2Z3"],
  ["Kula Yoga Annex", "The Annex", "304 Brunswick Ave, Toronto, ON M5S 2M7"],
  ["Sweaty Betty's", "Ossington", "13 Ossington Ave, Toronto, ON M6J 2Y7"],
  ["Evergreen Brick Works", "Don Valley", "550 Bayview Ave, Toronto, ON M4W 3X8"],
  ["The Communist's Daughter", "Dundas West", "1149 Dundas St W, Toronto, ON M6J 1X3"],
  ["Lavelle Rooftop", "King West", "627 King St W, Toronto, ON M5V 1M5"],
  ["Sunnyside Pavilion Cafe", "Sunnyside", "1755 Lake Shore Blvd W, Toronto, ON M6S 5A3"],
  ["Assembly Chef's Hall", "Financial District", "111 Richmond St W, Toronto, ON M5H 2G4"],
  ["Hammam Spa", "King West", "602 King St W, Toronto, ON M5V 1M6"],
  ["Market 707", "Trinity Bellwoods", "707 Dundas St W, Toronto, ON M5T 2W6"],
  ["The Royal Cinema", "Little Italy", "608 College St, Toronto, ON M6G 1B4"],
  ["The Theatre Centre", "Queen West", "1115 Queen St W, Toronto, ON M6J 1J1"],
  ["F45 Liberty Village", "Liberty Village", "60 Atlantic Ave, Toronto, ON M6K 1X9"],
  ["Fort York Open Air", "Fort York", "250 Fort York Blvd, Toronto, ON M5V 3K9"],
  ["Cabana Pool Bar", "Polson Pier", "11 Polson St, Toronto, ON M5A 1A4"],
  ["Rebel Nightclub", "Polson Pier", "11 Polson St, Toronto, ON M5A 1A4"],
  ["Leslieville Fitness", "Leslieville", "899 Queen St E, Toronto, ON M4M 1J4"],
  ["Nest Toronto", "King West", "423 Wellington St W, Toronto, ON M5V 1E7"],
  ["Dark Horse Espresso", "Riverside", "682 Queen St E, Toronto, ON M4M 1H8"],
  ["The Rex Jazz Bar", "Entertainment District", "194 Queen St W, Toronto, ON M5V 1Z1"],
  ["Pilot Coffee Roasters", "Leslieville", "983 Queen St E, Toronto, ON M4M 1J9"],
];

if (places.length !== TO.length) {
  throw new Error(`Expected ${TO.length} places, found ${places.length}`);
}

const out = places.map((p, i) => {
  const [name, neighborhood, address] = TO[i];
  return { ...p, name, neighborhood, address, description: `${name} in ${neighborhood}, Toronto.`, embedding: null };
});

writeFileSync(PATH, JSON.stringify(out, null, 2) + "\n");
console.log(`Re-located ${out.length} venues to Toronto.`);
