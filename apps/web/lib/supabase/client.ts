import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Component Supabase client. Uses the public URL + anon key only
 * (safe to expose — RLS is what actually protects data, not this key being
 * secret). Never import the service-role client (lib/supabase/admin.ts)
 * anywhere this file's neighborhood could end up in a client bundle.
 *
 * Memoized as a module-level singleton: several components call this
 * independently (Sidebar, useAuth, ShareDialog, ...), and reusing one
 * client means one shared auth listener/session cache instead of a new one
 * per call site.
 */
let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
