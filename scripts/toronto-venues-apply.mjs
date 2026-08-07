// Safe, non-destructive: update the 33 existing place rows in place to their
// Toronto values (name/neighborhood/address/description) by id. Does NOT delete
// plans or users (unlike the full re-seed). Run:
//   npx tsx --env-file=.env.local scripts/toronto-venues-apply.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY");

const sb = createClient(url, key, { auth: { persistSession: false } });
const places = JSON.parse(readFileSync(new URL("../data/places.json", import.meta.url), "utf8"));

let ok = 0;
let missing = 0;
for (const p of places) {
  const { data, error } = await sb
    .from("places")
    .update({ name: p.name, neighborhood: p.neighborhood, address: p.address, description: p.description })
    .eq("id", p.id)
    .select("id");
  if (error) {
    console.error("FAIL", p.id, error.message);
  } else if (!data || data.length === 0) {
    missing++;
  } else {
    ok++;
  }
}
console.log(`Updated ${ok} venues to Toronto; ${missing} ids not found in prod.`);
