import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. This key bypasses RLS entirely, which is
 * exactly why it must NEVER reach the browser (no NEXT_PUBLIC_ prefix on
 * its env var, and the `server-only` import above makes bundling this file
 * into a Client Component a build-time error, not just a convention).
 *
 * Used for: creating auth users during signup with username-derived shadow
 * emails (Supabase's public signUp() can't pre-check username uniqueness
 * against our `profiles` table before creating the auth user), and for the
 * dev-only seed script.
 */
export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (see .env.example) — never commit it.",
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
