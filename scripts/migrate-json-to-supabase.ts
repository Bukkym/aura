import { readFileSync } from "node:fs";
import { createClient } from "../lib/supabase/admin";
import type { Place, User } from "../types";

// One-shot migration: pushes the 175 seed users and 33 seed places from JSON
// into Postgres via the service-role admin client (bypasses RLS).
//
// Embeddings are already precomputed by the LLM seeders, so no OpenAI calls
// happen here. Vectors are shipped as the pgvector text format ("[0.1,0.2,...]")
// which JSON.stringify produces for plain number arrays.
//
// Idempotency policy: re-running wipes the seed mock data and reinserts it.
// "Seed mock data" specifically means: users with auth_user_id IS NULL, every
// place, every plan. Real authed users (auth_user_id NOT NULL) are preserved.
//
// Run with: npm run migrate:json-to-db
//   (which wraps `tsx --env-file=.env.local scripts/migrate-json-to-supabase.ts`)

const USERS_BATCH_SIZE = 50;

async function main() {
  const supabase = createClient();

  const users: User[] = JSON.parse(readFileSync("data/users.json", "utf-8"));
  const places: Place[] = JSON.parse(readFileSync("data/places.json", "utf-8"));

  console.log(`Loaded ${users.length} users, ${places.length} places from JSON`);

  // --- Wipe existing seed mock data ----------------------------------------
  // Supabase JS requires a filter on .delete() for safety. We use filters that
  // are always true for the rows we want to nuke.

  const { error: plansDelErr } = await supabase
    .from("plans")
    .delete()
    .not("id", "is", null);
  if (plansDelErr) throw new Error(`Failed to wipe plans: ${plansDelErr.message}`);

  const { error: usersDelErr } = await supabase
    .from("users")
    .delete()
    .is("auth_user_id", null);
  if (usersDelErr) throw new Error(`Failed to wipe mock users: ${usersDelErr.message}`);

  const { error: placesDelErr } = await supabase
    .from("places")
    .delete()
    .not("id", "is", null);
  if (placesDelErr) throw new Error(`Failed to wipe places: ${placesDelErr.message}`);

  console.log("Wiped existing mock data (auth'd users preserved)");

  // --- Insert places -------------------------------------------------------

  const placeRows = places.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    neighborhood: p.neighborhood,
    activity_type_tags: p.activityTypeTags,
    vibe_tags: p.vibeTags,
    description: p.description,
    embedding: JSON.stringify(p.embedding),
  }));

  const { error: placesInsErr } = await supabase.from("places").insert(placeRows);
  if (placesInsErr) throw new Error(`Failed to insert places: ${placesInsErr.message}`);
  console.log(`Inserted ${placeRows.length} places`);

  // --- Insert users in batches --------------------------------------------

  const userRows = users.map((u) => ({
    id: u.userId,
    auth_user_id: null,
    display_name: u.displayName,
    city: u.city,
    age_range_min: u.ageRange?.min ?? null,
    age_range_max: u.ageRange?.max ?? null,
    raw_inputs: u.rawInputs,
    self_extracted: u.selfExtracted,
    looking_for_extracted: u.lookingForExtracted,
    self_embedding: JSON.stringify(u.selfEmbedding),
    looking_for_embedding: JSON.stringify(u.lookingForEmbedding),
    archetype: u._archetype ?? null,
    created_at: u.createdAt,
  }));

  for (let i = 0; i < userRows.length; i += USERS_BATCH_SIZE) {
    const batch = userRows.slice(i, i + USERS_BATCH_SIZE);
    const { error } = await supabase.from("users").insert(batch);
    if (error) {
      throw new Error(
        `Failed to insert users batch ${i / USERS_BATCH_SIZE + 1}: ${error.message}`,
      );
    }
    console.log(
      `Inserted users batch ${i / USERS_BATCH_SIZE + 1}/${Math.ceil(userRows.length / USERS_BATCH_SIZE)} (${batch.length} rows)`,
    );
  }

  // --- Verify final counts -------------------------------------------------

  const [{ count: userCount }, { count: placeCount }, { count: planCount }] =
    await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("places").select("*", { count: "exact", head: true }),
      supabase.from("plans").select("*", { count: "exact", head: true }),
    ]);

  console.log(
    `Final counts: ${userCount} users, ${placeCount} places, ${planCount} plans`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
