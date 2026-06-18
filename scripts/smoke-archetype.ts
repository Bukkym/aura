import { createClient } from "../lib/supabase/admin";
import { buildArchetypeProfiles, assignArchetype } from "../lib/archetype";
import type { SelfExtracted } from "../types";

// Validates the cluster classifier against the seed pool: rebuild the cluster
// profiles, then re-assign every labeled seed user from their own chips and
// check it lands back in their true archetype. In-sample (each user is in its
// own cluster's profile), so this is an optimistic ceiling, but if even this is
// low the classifier is broken. Run: npm run smoke:archetype

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

async function main() {
  const sb = createClient();
  const { data, error } = await sb
    .from("users")
    .select("id, archetype, self_extracted")
    .not("archetype", "is", null);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { id: string; archetype: string; self_extracted: SelfExtracted }[];
  assert(rows.length > 0, "found labeled seed users");

  const profiles = buildArchetypeProfiles(rows);
  console.log(`Profiles: ${profiles.map((p) => `${p.archetype}(${p.members})`).join(", ")}\n`);

  let correct = 0;
  const confusion = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const got = assignArchetype(r.self_extracted, profiles);
    if (got === r.archetype) correct += 1;
    const m = confusion.get(r.archetype) ?? new Map<string, number>();
    m.set(got ?? "(null)", (m.get(got ?? "(null)") ?? 0) + 1);
    confusion.set(r.archetype, m);
  }

  const acc = correct / rows.length;
  console.log(`Self-consistency (in-sample): ${(acc * 100).toFixed(1)}%  (${correct}/${rows.length})\n`);
  for (const [arch, m] of [...confusion.entries()].sort()) {
    const parts = [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(", ");
    console.log(`  ${arch} -> ${parts}`);
  }

  assert(acc >= 0.8, `archetype self-consistency ${(acc * 100).toFixed(1)}% >= 80%`);
  console.log("\nsmoke:archetype OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
