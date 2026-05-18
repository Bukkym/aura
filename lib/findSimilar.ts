import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@/types";

// Thin wrappers around the `match_users` and `match_places` RPCs defined in
// supabase/migrations/20260518200707_match_functions.sql. This file is the
// single seam between application code and the vector store. Per the
// architectural rule in /technical/01-mvp-decisions.md, nothing outside this
// module should know we're on pgvector — swapping to another backend in the
// future means rewriting this file and nothing else.
//
// Callers pass their own SupabaseClient so the function works equally from
// Server Components, Route Handlers, and admin scripts. The RPC functions
// run SECURITY INVOKER so the caller's RLS context (anon / authed / service
// role) governs visibility. For the MVP, `users` and `places` are publicly
// readable, so any client works.

export interface SimilarUser {
  userId: string;
  score: number;
}

export interface SimilarPlace {
  placeId: string;
  score: number;
}

// pgvector accepts the JS array as long as we ship it through the JSON binding
// as the bracketed text form: "[0.1, 0.2, ...]". Same shape the seed migration
// uses, see scripts/migrate-json-to-supabase.ts.
function toVectorLiteral(embedding: number[]): string {
  return JSON.stringify(embedding);
}

export async function findSimilarUsers(
  sb: SupabaseClient,
  query: Pick<User, "userId" | "selfEmbedding" | "lookingForEmbedding">,
  k: number,
): Promise<SimilarUser[]> {
  const { data, error } = await sb.rpc("match_users", {
    query_self: toVectorLiteral(query.selfEmbedding),
    query_looking_for: toVectorLiteral(query.lookingForEmbedding),
    exclude_user_id: query.userId,
    k,
  });

  if (error) {
    throw new Error(`match_users RPC failed: ${error.message}`);
  }

  return (data ?? []).map((row: { user_id: string; score: number }) => ({
    userId: row.user_id,
    score: row.score,
  }));
}

export async function findSimilarPlaces(
  sb: SupabaseClient,
  queryEmbedding: number[],
  k: number,
): Promise<SimilarPlace[]> {
  const { data, error } = await sb.rpc("match_places", {
    query_embedding: toVectorLiteral(queryEmbedding),
    k,
  });

  if (error) {
    throw new Error(`match_places RPC failed: ${error.message}`);
  }

  return (data ?? []).map((row: { place_id: string; score: number }) => ({
    placeId: row.place_id,
    score: row.score,
  }));
}
