import type { User } from "@/types";

// Map a snake_case Supabase row from public.users into the camelCase User
// shape the rest of the app uses. Embeddings come back from pgvector as a
// string in the bracketed text form ("[0.1, 0.2, ...]"); parse it back into
// number[].

export type UserRow = {
  id: string;
  display_name: string;
  city: string;
  age_range_min: number | null;
  age_range_max: number | null;
  raw_inputs: User["rawInputs"];
  self_extracted: User["selfExtracted"];
  looking_for_extracted: User["lookingForExtracted"];
  self_embedding: string | number[] | null;
  looking_for_embedding: string | number[] | null;
  archetype: string | null;
  created_at: string;
};

export function userFromRow(row: UserRow): User {
  return {
    userId: row.id,
    displayName: row.display_name,
    city: row.city as "Berlin",
    ageRange:
      row.age_range_min !== null && row.age_range_max !== null
        ? { min: row.age_range_min, max: row.age_range_max }
        : undefined,
    createdAt: row.created_at,
    rawInputs: row.raw_inputs,
    selfExtracted: row.self_extracted,
    lookingForExtracted: row.looking_for_extracted,
    selfEmbedding: parseVector(row.self_embedding),
    lookingForEmbedding: parseVector(row.looking_for_embedding),
    _archetype: row.archetype ?? undefined,
  };
}

export function parseVector(v: string | number[] | null | undefined): number[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  return JSON.parse(v);
}

// Derive a display name from the caller's email: the local part with the first
// letter capitalized ("alice.smith@example.com" -> "Alice.smith"). Falls back
// to "Friend" when the email is missing or has an empty local part. Pure logic,
// kept here (not in the route) so it is reusable and unit-testable.
export function deriveDisplayNameFromEmail(email: string | undefined): string {
  if (!email) return "Friend";
  const local = email.split("@")[0] ?? "Friend";
  if (!local) return "Friend";
  return local.charAt(0).toUpperCase() + local.slice(1);
}
