import { setRequestLocale } from "next-intl/server";
import { PdpaConsentForm } from "@/components/pdpa/consent-form";
import { requireAppUser } from "@/lib/auth/require-user";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function PrivacyConsentPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAppUser(locale, {
    allowIncompleteOnboarding: true,
    allowMissingPdpa: true,
  });

  return <PdpaConsentForm />;
}
