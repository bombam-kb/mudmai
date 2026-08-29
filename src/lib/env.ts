export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Local-only fallback when Auth/DB env is missing. Never in production. */
export function isDemoAllowed() {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.JR_ALLOW_DEMO === "true";
}

/** LINE Login (openid). Needs Login channel + service role to mint a session. */
export function isLineLoginConfigured() {
  return Boolean(
    process.env.LINE_LOGIN_CHANNEL_ID &&
      process.env.LINE_LOGIN_CHANNEL_SECRET &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      (process.env.LINE_LOGIN_CALLBACK_URL || process.env.NEXT_PUBLIC_APP_URL),
  );
}

/** Messaging API push + webhook. Independent of Login so login can ship first. */
export function isLineMessagingConfigured() {
  return Boolean(
    process.env.LINE_MESSAGING_CHANNEL_SECRET &&
      process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
  );
}

export function lineLoginCallbackUrl() {
  return (
    process.env.LINE_LOGIN_CALLBACK_URL ||
    `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")}/api/line/callback`
  );
}

export function appPublicUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
