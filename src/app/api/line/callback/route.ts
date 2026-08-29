import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { isLineLoginConfigured, isSupabaseConfigured } from "@/lib/env";
import {
  LINE_OAUTH_COOKIE,
  exchangeLineCode,
  lineFriendship,
  parseOAuthState,
  verifyLineIdToken,
} from "@/lib/line/oauth";
import { createLineAuthUser, createSupabaseSessionForEmail } from "@/lib/line/session";
import { ensureLineUserProfile, upsertLineAccount } from "@/lib/line/account";
import { timingSafeEqualText } from "@/lib/crypto/secret";
import { rateLimitJson } from "@/lib/http/rate-limit";

function redirectTo(origin: string, locale: "th" | "en", path: string, error?: string) {
  const url = new URL(`/${locale}${path}`, origin);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(LINE_OAUTH_COOKIE)?.value;
  cookieStore.delete(LINE_OAUTH_COOKIE);

  const state = parseOAuthState(url.searchParams.get("state"));
  const locale = state?.locale === "en" ? "en" : "th";

  if (!isLineLoginConfigured() || !isSupabaseConfigured()) {
    return redirectTo(origin, locale, "/login", "line_config");
  }

  const limited = await rateLimitJson("line-callback", 60);
  if (limited) return limited;

  if (url.searchParams.get("error")) {
    return redirectTo(
      origin,
      locale,
      state?.intent === "link" ? "/settings" : "/login",
      "line_denied",
    );
  }

  const code = url.searchParams.get("code");
  if (
    !code ||
    !state ||
    !cookieToken ||
    !timingSafeEqualText(cookieToken, url.searchParams.get("state") ?? "")
  ) {
    return redirectTo(origin, locale, "/login", "line");
  }

  try {
    const tokens = await exchangeLineCode(code);
    if (!tokens.id_token) {
      return redirectTo(origin, locale, "/login", "line");
    }
    const lineUserId = await verifyLineIdToken(tokens.id_token);
    const reachable =
      url.searchParams.get("friendship_status_changed") === "true" ||
      (await lineFriendship(tokens.access_token));

    if (state.intent === "link") {
      const { user } = await getSessionUser();
      if (!user) return redirectTo(origin, locale, "/login", "line_session");
      const taken = await prisma.lineAccount.findUnique({ where: { lineUserId } });
      if (taken && taken.userId !== user.id) {
        return redirectTo(origin, locale, "/settings", "line_taken");
      }
      await upsertLineAccount({ userId: user.id, lineUserId, reachable });
      return redirectTo(origin, locale, "/settings");
    }

    const mapped = await prisma.lineAccount.findUnique({
      where: { lineUserId },
      include: { user: { select: { email: true } } },
    });

    if (mapped) {
      const ok = await createSupabaseSessionForEmail(mapped.user.email);
      if (!ok) return redirectTo(origin, locale, "/login", "line_session");
      await upsertLineAccount({ userId: mapped.userId, lineUserId, reachable });
      return redirectTo(origin, locale, state.next);
    }

    const created = await createLineAuthUser(lineUserId, locale);
    if (!created) return redirectTo(origin, locale, "/login", "line_session");

    let authUserId = created.id;
    if (!authUserId) {
      const existing = await prisma.user.findUnique({
        where: { email: created.email },
        select: { id: true },
      });
      authUserId = existing?.id ?? null;
    }

    if (authUserId) {
      await ensureLineUserProfile({
        authUserId,
        email: created.email,
        locale,
        pdpa: state.pdpa,
        referralCode: state.ref,
      });
      await upsertLineAccount({ userId: authUserId, lineUserId, reachable });
    }

    const ok = await createSupabaseSessionForEmail(created.email);
    if (!ok) return redirectTo(origin, locale, "/login", "line_session");

    if (!authUserId) {
      const { user } = await getSessionUser();
      if (!user) return redirectTo(origin, locale, "/login", "line_session");
      await ensureLineUserProfile({
        authUserId: user.id,
        email: created.email,
        locale,
        pdpa: state.pdpa,
        referralCode: state.ref,
      });
      await upsertLineAccount({ userId: user.id, lineUserId, reachable });
    }

    return redirectTo(origin, locale, state.next);
  } catch {
    return redirectTo(origin, locale, "/login", "line");
  }
}
