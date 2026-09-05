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
import {
  isLineUserTakenByOther,
  LineLinkTakenError,
  ensureLineUserProfile,
  upsertLineAccount,
} from "@/lib/line/account";
import { refreshLineReachability } from "@/lib/line/reachability";
import {
  createLineAuthUser,
  sessionRedirectForEmail,
  sessionRedirectForUserId,
} from "@/lib/line/session";
import { timingSafeEqualText } from "@/lib/crypto/secret";
import { rateLimitJson } from "@/lib/http/rate-limit";

function redirectTo(origin: string, locale: "th" | "en", path: string, error?: string) {
  const url = new URL(`/${locale}${path}`, origin);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

function lineTakenRedirect(
  origin: string,
  locale: "th" | "en",
  intent: "login" | "link" | undefined,
) {
  return redirectTo(origin, locale, intent === "link" ? "/settings" : "/login", "line_taken");
}

function oauthStateValid(stateParam: string | null, cookieToken: string | undefined) {
  const state = parseOAuthState(stateParam);
  if (!state) return null;
  if (cookieToken && stateParam && !timingSafeEqualText(cookieToken, stateParam)) {
    return null;
  }
  return state;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(LINE_OAUTH_COOKIE)?.value;
  cookieStore.delete(LINE_OAUTH_COOKIE);

  const stateParam = url.searchParams.get("state");
  const state = oauthStateValid(stateParam, cookieToken);
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
  if (!code || !state) {
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

    const { user: sessionUser } = await getSessionUser();

    if (state.intent === "link") {
      if (!sessionUser) return redirectTo(origin, locale, "/login", "line_session");
      if (await isLineUserTakenByOther(lineUserId, sessionUser.id)) {
        return lineTakenRedirect(origin, locale, "link");
      }
      await upsertLineAccount({ userId: sessionUser.id, lineUserId, reachable });
      await refreshLineReachability(sessionUser.id).catch(() => null);
      return redirectTo(origin, locale, "/settings");
    }

    const mapped = await prisma.lineAccount.findUnique({
      where: { lineUserId },
      select: { userId: true },
    });

    if (sessionUser) {
      if (mapped && mapped.userId !== sessionUser.id) {
        return lineTakenRedirect(origin, locale, "login");
      }
      await upsertLineAccount({ userId: sessionUser.id, lineUserId, reachable });
      return redirectTo(origin, locale, state.next);
    }

    if (mapped) {
      const redirect = await sessionRedirectForUserId(
        origin,
        locale,
        mapped.userId,
        state.next,
      );
      if (!redirect) return redirectTo(origin, locale, "/login", "line_session");
      await upsertLineAccount({ userId: mapped.userId, lineUserId, reachable });
      await refreshLineReachability(mapped.userId).catch(() => null);
      return redirect;
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

    const redirect = await sessionRedirectForEmail(origin, locale, created.email, state.next);
    if (!redirect) return redirectTo(origin, locale, "/login", "line_session");
    return redirect;
  } catch (error) {
    console.error("[line-callback]", error);
    if (error instanceof LineLinkTakenError) {
      return lineTakenRedirect(origin, locale, state?.intent);
    }
    return redirectTo(origin, locale, "/login", "line");
  }
}
