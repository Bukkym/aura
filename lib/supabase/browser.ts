import { createBrowserClient } from "@supabase/ssr";

// Browser client for use in Client Components. Reads the publishable key,
// which is safe to expose because Row Level Security gates every query.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
