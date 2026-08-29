import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { safeInternalPath } from "@/lib/http/safe-path";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeInternalPath(searchParams.get("next"), "/home");

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user) {
        await ensureProfile(data.user).catch(() => null);
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
    const login = new URL("/login", origin);
    login.searchParams.set("error", "auth");
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
