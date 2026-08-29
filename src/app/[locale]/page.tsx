import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingHeader } from "@/components/marketing/site-header";
import { MarketingFooter } from "@/components/marketing/site-footer";
import { WaypointTrail } from "@/components/marketing/waypoint-trail";
import { PillarHighlight } from "@/components/pillars/highlight";
import { AppPreviewGallery, AppPreviewHero } from "@/components/marketing/app-previews";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { AiSparkle } from "@/components/icons";
import { PLAN } from "@/lib/billing/plan";
import { PILLAR_MAP } from "@/lib/pillars";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function WelcomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketing");
  const { user } = await getSessionUser();

  return (
    <div className="jr-page-wash min-h-dvh">
      <WaypointTrail />
      <MarketingHeader signedIn={Boolean(user)} />

      <section className="jr-welcome-hero mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="inline-flex rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-personal ring-1 ring-violet-100">
            {t("eyebrow")}
          </p>
          <h1 className="mt-4 font-display text-5xl leading-tight text-ink sm:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">{t("subtitle")}</p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-sm font-semibold text-brand ring-1 ring-violet-100">
            <AiSparkle size={16} painted toColor={PILLAR_MAP.PERSONAL.color} />
            {t("aiBadge")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-card"
            >
              {t("ctaStart")}
            </Link>
            <Link
              href="/pricing"
              className="rounded-full bg-white px-6 py-3 font-semibold text-ink ring-1 ring-slate-200"
            >
              {t("ctaPricing")}
            </Link>
          </div>
        </div>
        <AppPreviewHero />
      </section>

      <section className="mx-auto grid max-w-6xl gap-3 px-4 pb-16 sm:grid-cols-3">
        {[
          { value: t("stat1Value"), label: t("stat1Label") },
          { value: t("stat2Value"), label: t("stat2Label") },
          { value: t("stat3Value", { price: PLAN.founderThb }), label: t("stat3Label") },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl bg-white/80 px-5 py-4 shadow-card ring-1 ring-white"
          >
            <p className="font-display text-2xl text-ink">{stat.value}</p>
            <p className="mt-1 text-sm text-muted">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-[2rem] bg-white/70 p-6 shadow-card ring-1 ring-white sm:p-8">
          <PillarHighlight />
        </div>
      </section>

      <HowItWorks />

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <AppPreviewGallery />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-[2rem] bg-white/90 p-6 shadow-card ring-1 ring-white sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-personal">
            {t("priceEyebrow")}
          </p>
          <h2 className="mt-2 font-display text-4xl">{t("priceTitle")}</h2>
          <p className="mt-3 max-w-2xl text-muted">
            {t("priceBody", {
              founder: PLAN.founderThb,
              yearly: PLAN.yearlyThb,
            })}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-card"
            >
              {t("ctaPricing")}
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-white px-6 py-3 font-semibold text-ink ring-1 ring-slate-200"
            >
              {t("ctaStart")}
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
