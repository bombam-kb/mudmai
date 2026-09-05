import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { linePlaceholderEmail } from "@/lib/line/oauth";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function createRouteHandlerClient(response?: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[],
      ) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Route handlers may reject cookieStore.set in some contexts.
          }
          response?.cookies.set(name, value, options);
        });
      },
    },
  });
}

async function verifyGeneratedLink(
  supabase: NonNullable<Awaited<ReturnType<typeof createRouteHandlerClient>>>,
  email: string,
) {
  const admin = createAdminClient();
  if (!admin) return false;

  const normalized = normalizeEmail(email);
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: normalized,
  });
  if (error || !data?.properties) return false;

  const { hashed_token: tokenHash, email_otp: emailOtp, verification_type } = data.properties;

  if (tokenHash) {
    const otpType =
      verification_type === "signup"
        ? "signup"
        : verification_type === "email_change_current" ||
            verification_type === "email_change_new"
          ? "email_change"
          : "magiclink";
    const { error: otpError } = await supabase.auth.verifyOtp({
      type: otpType as "magiclink",
      token_hash: tokenHash,
    });
    if (!otpError) return true;
  }

  if (emailOtp) {
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: normalized,
      token: emailOtp,
      type: "email",
    });
    if (!otpError) return true;
  }

  return false;
}

export async function createSupabaseSessionForEmail(
  email: string,
  response?: NextResponse,
) {
  const supabase = await createRouteHandlerClient(response);
  if (!supabase) return false;
  return verifyGeneratedLink(supabase, email);
}

export async function createSupabaseSessionForUserId(
  userId: string,
  response?: NextResponse,
) {
  const admin = createAdminClient();
  const supabase = await createRouteHandlerClient(response);
  if (!admin || !supabase) return false;

  const { data, error } = await admin.auth.admin.getUserById(userId);
  const email = data?.user?.email;
  if (error || !email) return false;
  return verifyGeneratedLink(supabase, email);
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
