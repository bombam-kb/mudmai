import { setRequestLocale } from "next-intl/server";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { requireAppUser } from "@/lib/auth/require-user";
import { reflectionToDraft } from "@/lib/onboarding/schema";
import { activeCalendarYear, lastCalendarYear } from "@/lib/year";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireAppUser(locale, {
    allowIncompleteOnboarding: true,
    withReflection: true,
  });

  return (
    <OnboardingWizard
      lastYear={lastCalendarYear()}
      activeYear={activeCalendarYear()}
      initial={session.reflection ? reflectionToDraft(session.reflection) : null}
      demoMode={session.demoMode}
    />
  );
}
