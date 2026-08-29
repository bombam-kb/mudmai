import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingHeader } from "@/components/marketing/site-header";
import { MarketingFooter } from "@/components/marketing/site-footer";
import { WaypointTrail } from "@/components/marketing/waypoint-trail";
import { PLAN } from "@/lib/billing/plan";
import { getSessionUser } from "@/lib/auth/session";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PromoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("promo");
  const { user } = await getSessionUser();
  const credit = PLAN.referralCreditThb;

  return (
    <div className="jr-page-wash min-h-dvh">
      <WaypointTrail />
      <MarketingHeader signedIn={Boolean(user)} />
      <main className="mx-auto max-w-3xl px-4 pb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-personal">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
          {t("title", { credit })}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">{t("subtitle", { credit })}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <section className="rounded-[2rem] bg-white/90 p-6 shadow-card ring-1 ring-white">
            <h2 className="font-display text-2xl">{t("youGet", { credit })}</h2>
            <p className="mt-2 text-sm text-muted">{t("youGetBody")}</p>
          </section>
          <section className="rounded-[2rem] bg-white/90 p-6 shadow-card ring-1 ring-white">
            <h2 className="font-display text-2xl">{t("friendGets", { credit })}</h2>
            <p className="mt-2 text-sm text-muted">
              {t("friendGetsBody", {
                founder: PLAN.founderThb,
                yearly: PLAN.yearlyThb,
              })}
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-card"
          >
            {t("cta")}
          </Link>
          <Link
            href="/pricing"
            className="rounded-full bg-white px-6 py-3 font-semibold text-ink ring-1 ring-slate-200"
          >
            {t("seePricing")}
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted">{t("fine")}</p>
      </main>
      <MarketingFooter />
    </div>
  );
}
