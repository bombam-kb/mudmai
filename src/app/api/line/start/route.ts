import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  isLineLoginConfigured,
  isSupabaseConfigured,
} from "@/lib/env";
import {
  LINE_OAUTH_COOKIE,
  lineAuthorizeUrl,
  newOAuthState,
  signOAuthState,
  type LineOAuthIntent,
} from "@/lib/line/oauth";
import { getSessionUser } from "@/lib/auth/session";
import { safeInternalPath } from "@/lib/http/safe-path";
import { parseCheckoutPlan } from "@/lib/billing/plan";
import { rateLimitJson } from "@/lib/http/rate-limit";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const intent = (url.searchParams.get("intent") === "link" ? "link" : "login") as LineOAuthIntent;
  const locale = url.searchParams.get("locale") === "en" ? "en" : "th";
  const limited = await rateLimitJson(`line-start:${intent}`, 40);
  if (limited) return limited;

  if (!isLineLoginConfigured() || !isSupabaseConfigured()) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=line_config`, url.origin));
  }

  if (intent === "link") {
    const { user } = await getSessionUser();
    if (!user) {
      return NextResponse.redirect(new URL(`/${locale}/login?error=line_session`, url.origin));
    }
  }

  const plan = parseCheckoutPlan(url.searchParams.get("plan")) ?? undefined;
  const state = newOAuthState({
    intent,
    locale,
    next: safeInternalPath(url.searchParams.get("next"), intent === "link" ? "/settings" : "/home"),
    plan,
    ref: url.searchParams.get("ref")?.trim() || undefined,
    pdpa: url.searchParams.get("pdpa") === "1",
  });
  const token = signOAuthState(state);
  const authorize = lineAuthorizeUrl(token);
  if (!authorize) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=line_config`, url.origin));
  }

  const cookieStore = await cookies();
  cookieStore.set(LINE_OAUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(authorize);
}
