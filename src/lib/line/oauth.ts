import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { lineLoginCallbackUrl } from "@/lib/env";

export const LINE_OAUTH_COOKIE = "jr-line-oauth";
export const LINE_LOGIN_SCOPE = "openid";

export type LineOAuthIntent = "login" | "link";

export type LineOAuthState = {
  nonce: string;
  intent: LineOAuthIntent;
  locale: "th" | "en";
  next: string;
  plan?: string;
  ref?: string;
  pdpa: boolean;
};

function signingSecret() {
  return process.env.LINE_LOGIN_CHANNEL_SECRET ?? "";
}

export function signOAuthState(state: LineOAuthState) {
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  const sig = createHmac("sha256", signingSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function parseOAuthState(raw: string | undefined | null): LineOAuthState | null {
  if (!raw || !signingSecret()) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = createHmac("sha256", signingSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as LineOAuthState;
    if (parsed.intent !== "login" && parsed.intent !== "link") return null;
    if (parsed.locale !== "th" && parsed.locale !== "en") return null;
    if (typeof parsed.nonce !== "string" || parsed.nonce.length < 8) return null;
    return {
      nonce: parsed.nonce,
      intent: parsed.intent,
      locale: parsed.locale,
      next: typeof parsed.next === "string" ? parsed.next : "/home",
      plan: typeof parsed.plan === "string" ? parsed.plan : undefined,
      ref: typeof parsed.ref === "string" ? parsed.ref : undefined,
      pdpa: Boolean(parsed.pdpa),
    };
  } catch {
    return null;
  }
}

export function newOAuthState(input: Omit<LineOAuthState, "nonce">): LineOAuthState {
  return { ...input, nonce: randomBytes(16).toString("hex") };
}

export function lineAuthorizeUrl(stateToken: string) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) return null;
  const url = new URL("https://access.line.me/oauth2/v2.1/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", channelId);
  url.searchParams.set("redirect_uri", lineLoginCallbackUrl());
  url.searchParams.set("state", stateToken);
  url.searchParams.set("scope", LINE_LOGIN_SCOPE);
  url.searchParams.set("bot_prompt", "aggressive");
  url.searchParams.set("nonce", randomBytes(8).toString("hex"));
  return url.toString();
}

export type LineTokenResponse = {
  access_token: string;
  id_token?: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
};

export async function exchangeLineCode(code: string): Promise<LineTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: lineLoginCallbackUrl(),
    client_id: process.env.LINE_LOGIN_CHANNEL_ID ?? "",
    client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET ?? "",
  });
  const response = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error("line_token");
  }
  return (await response.json()) as LineTokenResponse;
}

export async function verifyLineIdToken(idToken: string) {
  const body = new URLSearchParams({
    id_token: idToken,
    client_id: process.env.LINE_LOGIN_CHANNEL_ID ?? "",
  });
  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error("line_id_token");
  }
  const json = (await response.json()) as { sub?: string; aud?: string };
  const sub = json.sub?.trim();
  if (!sub) throw new Error("line_sub");
  return sub;
}

export async function lineFriendship(accessToken: string) {
  const response = await fetch("https://api.line.me/friendship/v1/status", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return false;
  const json = (await response.json()) as { friendFlag?: boolean };
  return Boolean(json.friendFlag);
}

export const LINE_PLACEHOLDER_EMAIL_DOMAIN = "line.invalid";

export function linePlaceholderEmail(lineUserId: string) {
  return `line-${lineUserId.toLowerCase()}@${LINE_PLACEHOLDER_EMAIL_DOMAIN}`;
}

export function isLinePlaceholderEmail(email: string | null | undefined) {
  return Boolean(email?.toLowerCase().endsWith(`@${LINE_PLACEHOLDER_EMAIL_DOMAIN}`));
}
