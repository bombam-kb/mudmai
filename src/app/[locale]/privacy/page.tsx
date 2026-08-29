import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingHeader } from "@/components/marketing/site-header";
import { MarketingFooter } from "@/components/marketing/site-footer";
import { WaypointTrail } from "@/components/marketing/waypoint-trail";
import { PdpaNotice } from "@/components/pdpa/notice";
import { getSessionUser } from "@/lib/auth/session";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pdpa");
  const { user } = await getSessionUser();

  return (
    <div className="jr-page-wash min-h-dvh">
      <WaypointTrail />
      <MarketingHeader signedIn={Boolean(user)} />
      <main className="mx-auto max-w-3xl px-4 pb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-personal">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-4xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("updated")}</p>
        <div className="mt-6 rounded-[2rem] bg-white/90 p-6 shadow-card ring-1 ring-white">
          <PdpaNotice />
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/" className="font-semibold text-brand">
            {t("back")}
          </Link>
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
