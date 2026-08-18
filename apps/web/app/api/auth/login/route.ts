import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { checkRateLimit, clientIpFromRequest } from "../../../../lib/auth/rate-limit";

const GENERIC_ERROR = "Usuário ou senha inválidos.";

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const rateLimit = checkRateLimit(`login:${ip}`, 10, 5 * 60_000); // 10 attempts / 5min / IP
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${rateLimit.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // resolve_login_email is SECURITY DEFINER and returns null for an unknown
  // username — deliberately handled identically to a wrong password below,
  // so this single endpoint never reveals which one was wrong.
  const { data: email, error: resolveError } = await supabase.rpc("resolve_login_email", {
    p_username: username,
  });

  if (resolveError || !email) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
