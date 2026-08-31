import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { prisma } from "@/lib/prisma";
import { activeCalendarYear } from "@/lib/year";

const profileSelect = {
  id: true,
  name: true,
  onboardingComplete: true,
  pdpaConsentAt: true,
  pdpaConsentVersion: true,
} as const;

const reflectionSelect = {
  id: true,
  lastYearStory: true,
  happiestMoment: true,
  keyLearnings: true,
  healingThings: true,
  expectationsNextYear: true,
  ratingCareer: true,
  ratingPersonal: true,
  ratingFinance: true,
  ratingRelationships: true,
  ratingMental: true,
  ratingPhysical: true,
} as const;

export type SessionProfile = {
  id: string;
  name: string;
  onboardingComplete: boolean;
  pdpaConsentAt: Date | null;
  pdpaConsentVersion: string | null;
};

export type SessionReflection = {
  id: string;
  lastYearStory: string;
  happiestMoment: string;
  keyLearnings: string;
  healingThings: string;
  expectationsNextYear: string;
  ratingCareer: number;
  ratingPersonal: number;
  ratingFinance: number;
  ratingRelationships: number;
  ratingMental: number;
  ratingPhysical: number;
};

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  if (!supabase) {
    return { supabase: null, user: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user: user ?? null };
});

async function readProfile(userId: string) {
  return prisma.user
    .findUnique({
      where: { id: userId },
      select: profileSelect,
    })
    .catch((error) => {
      console.error("getSessionProfile", error);
      return null;
    });
}

export const getSessionProfile = cache(async (
  locale: "th" | "en" = "th",
  withReflection = false,
) => {
  const { user } = await getSessionUser();
  if (!user) {
    return { user: null, profile: null, reflection: null, reflectionExists: false };
  }

  const year = activeCalendarYear();
  let profile: SessionProfile | null = await readProfile(user.id);

  if (!profile) {
    const created = await ensureProfile(user, locale).catch((error) => {
      console.error("ensureProfile", error);
      return null;
    });
    if (created) {
      profile = {
        id: created.id,
        name: created.name,
        onboardingComplete: created.onboardingComplete,
        pdpaConsentAt: created.pdpaConsentAt,
        pdpaConsentVersion: created.pdpaConsentVersion,
      };
    } else {
      profile = await readProfile(user.id);
    }
  }

  let reflection: SessionReflection | null = null;
  let reflectionExists = Boolean(profile?.onboardingComplete);

  if (profile && (withReflection || !profile.onboardingComplete)) {
    if (withReflection) {
      reflection = await prisma.pastYearReflection
        .findFirst({
          where: { userId: user.id, year },
          select: reflectionSelect,
        })
        .catch(() => null);
      reflectionExists = Boolean(reflection);
    } else {
      const row = await prisma.pastYearReflection
        .findFirst({
          where: { userId: user.id, year },
          select: { id: true },
        })
        .catch(() => null);
      reflectionExists = Boolean(row);
    }
  }

  return {
    user,
    profile,
    reflection,
    reflectionExists,
  };
});
