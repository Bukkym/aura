import { createClient } from "../lib/supabase/admin";
import { canonAll } from "../lib/canon";

// Seed canonicalization replay (Slice 5). Pushes every user's descriptive tag
// arrays through lib/canon.ts so the stored tags are canonical at rest, not
// just canonicalized on read by the matcher. Embeddings, scalars (budget),
// connectionType (a closed enum), and every other column are left untouched.
//
//   npm run seed:canon         apply: rewrite rows whose tags drift
//   npm run seed:canon:check   CI assertion: exit 1 if any drift remains
//
// Idempotent: re-running on already-canonical data is a no-op.

const CHECK = process.argv.includes("--check");

// The descriptive string[] fields canon applies to. connectionType (enum) and
// budget (scalar) are intentionally excluded.
const SELF_TAG_FIELDS = [
  "personality",
  "interests",
  "activityTypes",
  "socialPreferences",
  "lifeContext",
  "vibeKeywords",
  "availability",
  "neighborhoods",
] as const;
const LF_TAG_FIELDS = [
  "personality",
  "interests",
  "socialPreferences",
  "vibeKeywords",
  "activityTypes",
  "neighborhoods",
] as const;

type Bag = Record<string, unknown>;

function sameArray(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

// Canonicalize the known tag fields of an extracted-profile object. Returns the
// (possibly) rewritten object and whether anything changed. Absent fields stay
// absent; non-array values are left alone.
function canonProfile(obj: Bag | null | undefined, fields: readonly string[]): { out: Bag; changed: boolean } {
  const src: Bag = obj ?? {};
  const out: Bag = { ...src };
  let changed = false;
  for (const f of fields) {
    const v = src[f];
    if (Array.isArray(v)) {
      const c = canonAll(v as string[]);
      if (!sameArray(c, v as string[])) {
        out[f] = c;
        changed = true;
      }
    }
  }
  return { out, changed };
}

async function main() {
  const sb = createClient();

  const { data: rows, error } = await sb
    .from("users")
    .select("id, display_name, self_extracted, looking_for_extracted");
  if (error) throw new Error(`Failed to load users: ${error.message}`);

  let drift = 0;
  let updated = 0;

  for (const row of rows ?? []) {
    const self = canonProfile(row.self_extracted as Bag, SELF_TAG_FIELDS);
    const lf = canonProfile(row.looking_for_extracted as Bag, LF_TAG_FIELDS);
    if (!self.changed && !lf.changed) continue;

    drift++;
    if (CHECK) {
      console.log(`  drift · ${row.display_name} (${row.id})`);
      continue;
    }

    const { error: upErr } = await sb
      .from("users")
      .update({ self_extracted: self.out, looking_for_extracted: lf.out })
      .eq("id", row.id);
    if (upErr) throw new Error(`Update failed for ${row.id}: ${upErr.message}`);
    updated++;
  }

  const total = rows?.length ?? 0;
  console.log(
    `\nscanned ${total} users · ${drift} with pre-canonical tags${CHECK ? "" : ` · ${updated} rewritten`}`,
  );

  if (CHECK && drift > 0) {
    console.error(`\n✗ ${drift} seed users still carry pre-canonical tags. Run \`npm run seed:canon\`.`);
    process.exit(1);
  }
  console.log(CHECK ? "✓ all seed tags are canonical" : "✓ canon replay complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
