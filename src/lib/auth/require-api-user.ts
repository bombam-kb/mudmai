import { NextResponse } from "next/server";
import type { User as AuthUser } from "@supabase/supabase-js";
import { getSessionProfile } from "@/lib/auth/session";
import { needsOnboarding, needsPdpaConsent } from "@/lib/auth/gate";

type Profile = Awaited<ReturnType<typeof getSessionProfile>>["profile"];
type Reflection = Awaited<ReturnType<typeof getSessionProfile>>["reflection"];

export type ApiUser =
  | {
      ok: true;
      user: AuthUser;
      profile: Profile;
      reflection: Reflection;
    }
  | { ok: false; response: NextResponse };

export async function requireApiUser(options?: {
  allowMissingPdpa?: boolean;
  allowIncompleteOnboarding?: boolean;
}): Promise<ApiUser> {
  const { user, profile, reflection } = await getSessionProfile();
  if (!user) {
    return { ok: false, response: NextResponse.json({ ok: false }, { status: 401 }) };
  }

  if (!options?.allowMissingPdpa && needsPdpaConsent(profile)) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "pdpa" }, { status: 403 }),
    };
  }

  if (!options?.allowIncompleteOnboarding && needsOnboarding(profile, reflection)) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "onboarding" }, { status: 403 }),
    };
  }

  return { ok: true, user, profile, reflection };
}
