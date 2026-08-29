import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { linePlaceholderEmail } from "@/lib/line/oauth";

export async function createSupabaseSessionForEmail(email: string) {
  const admin = createAdminClient();
  const supabase = await createClient();
  if (!admin || !supabase) return false;

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return false;

  const { error: otpError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: tokenHash,
  });
  return !otpError;
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
