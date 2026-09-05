import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { safeInternalPath } from "@/lib/http/safe-path";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeInternalPath(searchParams.get("next"), "/home");
  const redirect = NextResponse.redirect(`${origin}${next}`);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type") ?? "magiclink";

  const supabase = await createClient(redirect);
  if (!supabase) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", "auth");
    return NextResponse.redirect(login);
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await ensureProfile(data.user).catch(() => null);
      return redirect;
    }
    const login = new URL("/login", origin);
    login.searchParams.set("error", "auth");
    return NextResponse.redirect(login);
  }

  if (tokenHash) {
    const type =
      otpType === "signup"
        ? "signup"
        : otpType === "email"
          ? "email"
          : otpType === "email_change"
            ? "email_change"
            : "magiclink";
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as "magiclink",
      token_hash: tokenHash,
    });
    if (!error && data.user) {
      await ensureProfile(data.user).catch(() => null);
      return redirect;
    }
    const login = new URL("/login", origin);
    login.searchParams.set("error", "line_session");
    return NextResponse.redirect(login);
  }

  return redirect;
}
