#!/usr/bin/env node
/**
 * Seeds the admin/123456 development test account.
 *
 * WHY THIS EXISTS AS A SEPARATE SCRIPT, NOT PART OF THE APP:
 * `123456` fails the app's own password policy (needs an uppercase letter
 * and a digit — it has no uppercase letter). Rather than special-casing the
 * public signup/login validators to silently accept this one password (a
 * hidden backdoor baked into product code), we create the account directly
 * via the Supabase admin API, bypassing the normal signup flow entirely.
 * The account itself is a completely ordinary account once created —
 * `123456` isn't a magic value the app recognizes, it's genuinely just this
 * one seeded user's real (weak, dev-only) password.
 *
 * This script refuses to run unless NODE_ENV is NOT "production", so it
 * can't accidentally seed a weak, publicly-known password into a real
 * deployment.
 *
 * Usage (from apps/web):
 *   node --env-file=.env.local scripts/seed-dev-admin.mjs
 */
import { createClient } from "@supabase/supabase-js";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed the dev admin account: NODE_ENV=production.");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run this with your env loaded, e.g.:\n" +
      "  node --env-file=apps/web/.env.local scripts/seed-dev-admin.mjs (from apps/web)",
  );
  process.exit(1);
}

// Must match usernameToShadowEmail() in apps/web/lib/auth/validation.ts
// exactly. Duplicated here because this script runs standalone, outside the
// Next.js/TypeScript build.
const USERNAME = "admin";
const PASSWORD = "123456";
const SHADOW_EMAIL = `${USERNAME.toLowerCase()}@users.nexusnote.internal`;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: SHADOW_EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });

  if (createError) {
    if (createError.message?.toLowerCase().includes("already been registered")) {
      console.log(`"${USERNAME}" already exists — nothing to do.`);
      return;
    }
    console.error("Failed to create auth user:", createError.message);
    process.exit(1);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: created.user.id, username: USERNAME });

  if (profileError) {
    console.error("Auth user created, but profile insert failed:", profileError.message);
    process.exit(1);
  }

  console.log(`Seeded dev account — username: "${USERNAME}", password: "${PASSWORD}" (dev only).`);
}

main();
