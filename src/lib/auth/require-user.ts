import type { User as AuthUser } from "@supabase/supabase-js";
import { redirect } from "@/i18n/navigation";
import { getSessionProfile, getSessionUser } from "@/lib/auth/session";
import { needsOnboarding, needsPdpaConsent } from "@/lib/auth/gate";
import { isDemoAllowed } from "@/lib/env";

type Locale = "th" | "en";

export function displayName(
  locale: string,
  profile?: { name: string } | null,
  user?: AuthUser | null,
) {
  return (
    profile?.name ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    (locale === "th" ? "นักเดินทาง" : "Traveler")
  );
}

export async function requireAppUser(
  locale: string,
  options?: {
    allowIncompleteOnboarding?: boolean;
    allowMissingPdpa?: boolean;
    withReflection?: boolean;
  },
) {
  const appLocale: Locale = locale === "en" ? "en" : "th";
  const { supabase } = await getSessionUser();

  if (!supabase) {
    if (!isDemoAllowed()) {
      redirect({ href: "/", locale });
    }
    return {
      demoMode: true as const,
      user: null,
      profile: null,
      reflection: null,
      name: displayName(appLocale),
    };
  }

  const { user, profile, reflection, reflectionExists } = await getSessionProfile(
    appLocale,
    Boolean(options?.withReflection),
  );
  if (!user) {
    redirect({ href: "/login", locale });
    throw new Error("unauthenticated");
  }

  if (!options?.allowMissingPdpa && needsPdpaConsent(profile)) {
    redirect({ href: "/privacy/consent", locale });
  }

  if (
    !options?.allowIncompleteOnboarding &&
    needsOnboarding(profile, reflection ?? (reflectionExists ? { id: true } : null))
  ) {
    redirect({ href: "/onboarding", locale });
  }

  return {
    demoMode: false as const,
    user,
    profile,
    reflection,
    name: displayName(appLocale, profile, user),
  };
}
