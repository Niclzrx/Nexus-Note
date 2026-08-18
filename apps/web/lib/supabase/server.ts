import type { CookieOptions } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Route Handler / Server Component Supabase client. Reads and refreshes the
 * session from the request's cookies, still scoped to the anon key + RLS —
 * this is NOT an admin client. Use lib/supabase/admin.ts for operations
 * that must bypass RLS (e.g. creating a user during signup).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component (not a Route Handler / Server
            // Action) — cookies() is read-only there. Session refresh still
            // happens correctly via middleware.ts on the next request.
          }
        },
      },
    },
  );
}
