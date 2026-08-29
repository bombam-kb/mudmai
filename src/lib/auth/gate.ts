import { PDPA_VERSION } from "@/lib/pdpa";

export function needsOnboarding(
  profile: { onboardingComplete: boolean } | null,
  reflection: unknown | null,
) {
  return Boolean(profile) && !profile?.onboardingComplete && !reflection;
}

export function needsPdpaConsent(
  profile: { pdpaConsentAt: Date | null; pdpaConsentVersion?: string | null } | null,
) {
  if (!profile?.pdpaConsentAt) return true;
  return profile.pdpaConsentVersion !== PDPA_VERSION;
}
