import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Admin client for system tasks that intentionally bypass Row Level Security:
// the JSON → Postgres migration, the LLM seeders, future backfill scripts.
// Never import this from a Client Component or any code that runs in the
// browser — the secret key must stay server-side.
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
