import { NextResponse } from "next/server";
import type { User as AuthUser } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth/session";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { needsOnboarding, needsPdpaConsent } from "@/lib/auth/gate";
import { prisma } from "@/lib/prisma";

export type ApiProfile = {
  id: string;
  createdAt: Date;
  onboardingComplete: boolean;
  pdpaConsentAt: Date | null;
  pdpaConsentVersion: string | null;
};

const profileSelect = {
  id: true,
  createdAt: true,
  onboardingComplete: true,
  pdpaConsentAt: true,
  pdpaConsentVersion: true,
} as const;

export type ApiUser =
  | {
      ok: true;
      user: AuthUser;
      profile: ApiProfile | null;
      reflection: { id: string } | null;
    }
  | { ok: false; response: NextResponse };

export async function requireApiUser(options?: {
  allowMissingPdpa?: boolean;
  allowIncompleteOnboarding?: boolean;
}): Promise<ApiUser> {
  const { user } = await getSessionUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ ok: false }, { status: 401 }) };
  }

  let profile: ApiProfile | null = await prisma.user
    .findUnique({ where: { id: user.id }, select: profileSelect })
    .catch(() => null);

  if (!profile) {
    const created = await ensureProfile(user).catch(() => null);
    if (created) {
      profile = {
        id: created.id,
        createdAt: created.createdAt,
        onboardingComplete: created.onboardingComplete,
        pdpaConsentAt: created.pdpaConsentAt,
        pdpaConsentVersion: created.pdpaConsentVersion,
      };
    }
  }

  if (!options?.allowMissingPdpa && needsPdpaConsent(profile)) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "pdpa" }, { status: 403 }),
    };
  }

  let reflection: { id: string } | null = null;
  if (!options?.allowIncompleteOnboarding && profile && !profile.onboardingComplete) {
    reflection = await prisma.pastYearReflection
      .findFirst({
        where: { userId: user.id },
        select: { id: true },
      })
      .catch(() => null);
    if (needsOnboarding(profile, reflection)) {
      return {
        ok: false,
        response: NextResponse.json({ ok: false, error: "onboarding" }, { status: 403 }),
      };
    }
  }

  return { ok: true, user, profile, reflection };
}
