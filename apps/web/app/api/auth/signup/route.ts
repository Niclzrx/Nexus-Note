import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";
import { usernameToShadowEmail, validatePassword, validateUsername } from "../../../../lib/auth/validation";
import { checkRateLimit, clientIpFromRequest } from "../../../../lib/auth/rate-limit";

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const rateLimit = checkRateLimit(`signup:${ip}`, 5, 10 * 60_000); // 5 signups / 10min / IP
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${rateLimit.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  // Never trust the client's own validation — re-run the exact same rules
  // server-side (§2, §3, §20, §28). The client sees these same messages
  // instantly via the shared validators; this is the copy that actually
  // gates account creation.
  const usernameError = validateUsername(username);
  if (usernameError) return NextResponse.json({ error: usernameError }, { status: 400 });
  const passwordError = validatePassword(password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const shadowEmail = usernameToShadowEmail(username);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: shadowEmail,
    password,
    email_confirm: true, // no real inbox exists at this address to confirm
  });

  if (createError || !created.user) {
    // Supabase Auth itself enforces email uniqueness, which — since the
    // shadow email is derived 1:1 from the (case-insensitive) username —
    // is what actually blocks duplicate usernames at the auth layer. The
    // `profiles.username` unique constraint is the second, belt-and-braces
    // layer in case of a race between two signups.
    //
    // IMPORTANT: this used to report "username already in use" for ANY
    // failure here, which was actively misleading — a misconfigured
    // service-role key, a Supabase project setting blocking the shadow
    // email's domain, rate limiting on Supabase's own side, etc. would all
    // show up to the user as "that username is taken" even for a brand new
    // username, with the real cause invisible. Only the specific
    // already-registered case gets that message now; everything else is
    // logged server-side (never logs the password) and reported honestly.
    const message = createError?.message?.toLowerCase() ?? "";
    const isDuplicate =
      message.includes("already been registered") ||
      message.includes("already registered") ||
      message.includes("already exists");

    if (isDuplicate) {
      return NextResponse.json({ error: "Este nome de usuário já está em uso." }, { status: 409 });
    }

    console.error("[signup] admin.createUser failed:", createError?.message ?? "no user returned");
    return NextResponse.json(
      { error: "Não foi possível criar a conta agora. Tente novamente em instantes." },
      { status: 500 },
    );
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: created.user.id, username });

  if (profileError) {
    // Roll back the orphaned auth user rather than leaving a half-created
    // account that can never be signed up again (its email is taken) nor
    // logged into (no profile row, so resolve_login_email returns nothing).
    await admin.auth.admin.deleteUser(created.user.id);

    // Postgres unique_violation is the only case that's genuinely "this
    // username is taken" — anything else (RLS, constraint mismatch,
    // connection issue) gets logged and reported honestly instead of
    // masquerading as a duplicate.
    const isDuplicate = profileError.code === "23505";
    if (isDuplicate) {
      return NextResponse.json({ error: "Este nome de usuário já está em uso." }, { status: 409 });
    }

    console.error("[signup] profile insert failed:", profileError.message);
    return NextResponse.json(
      { error: "Não foi possível criar a conta agora. Tente novamente em instantes." },
      { status: 500 },
    );
  }

  // Sign the new user in immediately, on the request-bound server client so
  // the session cookie is actually set on this response.
  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: shadowEmail,
    password,
  });
  if (signInError) {
    // Account exists and is valid; the user can just log in normally.
    return NextResponse.json({ success: true, requiresLogin: true });
  }

  return NextResponse.json({ success: true });
}
