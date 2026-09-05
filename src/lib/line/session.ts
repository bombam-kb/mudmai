import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/http/safe-path";
import { linePlaceholderEmail } from "@/lib/line/oauth";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function magicLinkTokenHash(email: string) {
  const admin = createAdminClient();
  if (!admin) return null;

  const normalized = normalizeEmail(email);
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: normalized,
  });
  if (error || !data?.properties?.hashed_token) return null;
  return data.properties.hashed_token;
}

/** Redirect through /auth/callback so Supabase session cookies attach reliably on mobile. */
export async function sessionRedirectForEmail(
  origin: string,
  locale: "th" | "en",
  email: string,
  next: string,
) {
  const tokenHash = await magicLinkTokenHash(email);
  if (!tokenHash) return null;

  const target = safeInternalPath(next, "/home");
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("token_hash", tokenHash);
  callback.searchParams.set("type", "magiclink");
  callback.searchParams.set("next", `/${locale}${target}`);
  return NextResponse.redirect(callback.toString());
}

export async function sessionRedirectForUserId(
  origin: string,
  locale: "th" | "en",
  userId: string,
  next: string,
) {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.auth.admin.getUserById(userId);
  const email = data?.user?.email;
  if (error || !email) return null;
  return sessionRedirectForEmail(origin, locale, email, next);
}

export async function createSupabaseSessionForEmail(
  email: string,
  response?: NextResponse,
) {
  const supabase = await createClient(response);
  if (!supabase) return false;

  const tokenHash = await magicLinkTokenHash(email);
  if (!tokenHash) return false;

  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  return !error;
}

export async function createSupabaseSessionForUserId(
  userId: string,
  response?: NextResponse,
) {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data, error } = await admin.auth.admin.getUserById(userId);
  const email = data?.user?.email;
  if (error || !email) return false;
  return createSupabaseSessionForEmail(email, response);
}

export async function createLineAuthUser(lineUserId: string, locale: "th" | "en") {
  const admin = createAdminClient();
  if (!admin) return null;
  const email = linePlaceholderEmail(lineUserId);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      name: locale === "en" ? "Traveler" : "นักเดินทาง",
      authProvider: "line",
    },
  });
  if (data?.user) return { id: data.user.id, email };
  if (error && /already|registered|exists/i.test(error.message)) {
    return { id: null, email };
  }
  return null;
}
