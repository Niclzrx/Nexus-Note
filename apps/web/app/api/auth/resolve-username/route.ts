import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { validateUsername } from "../../../../lib/auth/validation";
import { checkRateLimit, clientIpFromRequest } from "../../../../lib/auth/rate-limit";

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const rateLimit = checkRateLimit(`resolve-username:${ip}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const validationError = validateUsername(username);
  if (validationError) {
    return NextResponse.json({ available: false, error: validationError });
  }

  const supabase = await createSupabaseServerClient();
  const { data: email } = await supabase.rpc("resolve_login_email", { p_username: username });

  return NextResponse.json({ available: !email });
}
