import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingHeader } from "@/components/marketing/site-header";
import { MarketingFooter } from "@/components/marketing/site-footer";
import { WaypointTrail } from "@/components/marketing/waypoint-trail";
import { PricingBoard } from "@/components/marketing/pricing-board";
import { PLAN, parseCheckoutPlan } from "@/lib/billing/plan";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
};

export default async function PricingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const { user } = await getSessionUser();

  const existing = user
    ? await prisma.billingCheckout
        .findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        })
        .catch(() => null)
    : null;

  const referral = user
    ? await prisma.referral
        .findUnique({ where: { referredUserId: user.id } })
        .catch(() => null)
    : null;
  const referralDiscountThb = referral && !referral.checkoutId ? referral.discountThb : 0;

  const initialPlan =
    parseCheckoutPlan(query.plan) ??
    (existing?.plan === "FOUNDER"
      ? "founder"
      : existing?.plan === "YEARLY"
        ? "yearly"
        : parseCheckoutPlan(
            typeof user?.user_metadata?.planIntent === "string"
              ? user.user_metadata.planIntent
              : null,
          ));

  return (
    <div className="jr-page-wash min-h-dvh">
      <WaypointTrail />
      <MarketingHeader signedIn={Boolean(user)} />
      <main className="mx-auto max-w-6xl px-4 pb-8 pt-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-personal">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">
          {t("subtitle", {
            founder: PLAN.founderThb,
            yearly: PLAN.yearlyThb,
          })}
        </p>

        <div className="mt-8">
          <PricingBoard
            signedIn={Boolean(user)}
            initialPlan={initialPlan}
            promptPayId={process.env.NEXT_PUBLIC_PROMPTPAY_ID?.trim() || undefined}
            referralDiscountThb={referralDiscountThb}
            existing={
              existing
                ? {
                    plan: existing.plan,
                    amountThb: existing.amountThb,
                    status: existing.status,
                    listPriceThb: existing.listPriceThb ?? existing.amountThb,
                    discountThb: existing.discountThb,
                  }
                : null
            }
          />
        </div>

        <section className="mt-12">
          <h2 className="font-display text-3xl">{t("compareTitle")}</h2>
          <div className="mt-4 overflow-x-auto rounded-[1.75rem] bg-white/90 shadow-card ring-1 ring-white">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-muted">
                  <th className="px-4 py-3 font-semibold">{t("colFeature")}</th>
                  <th className="px-4 py-3 font-semibold">{t("freeName")}</th>
                  <th className="px-4 py-3 font-semibold">{t("founderName")}</th>
                  <th className="px-4 py-3 font-semibold">{t("yearlyName")}</th>
                </tr>
              </thead>
              <tbody className="text-ink">
                {(
                  [
                    ["rowYear1", t("yes"), t("yes"), t("yes")],
                    ["rowTodos", t("rowTodosFree"), t("rowTodosPaid"), t("rowTodosPaid")],
                    ["rowVision", t("rowVisionFree"), t("rowVisionPaid"), t("rowVisionPaid")],
                    ["rowRenew", t("rowRenewFree", { price: PLAN.yearlyThb }), t("rowRenewFounder", { price: PLAN.founderThb }), t("rowRenewYearly", { price: PLAN.yearlyThb })],
                    ["rowLock", t("no"), t("yes"), t("no")],
                  ] as const
                ).map(([key, a, b, c]) => (
                  <tr key={key} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-semibold">{t(key)}</td>
                    <td className="px-4 py-3">{a}</td>
                    <td className="px-4 py-3">{b}</td>
                    <td className="px-4 py-3">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          <h2 className="font-display text-3xl sm:col-span-2">{t("faqTitle")}</h2>
          {(["faq1", "faq2", "faq3", "faq4"] as const).map((key) => (
            <div
              key={key}
              className="rounded-[1.75rem] bg-white/90 p-5 shadow-card ring-1 ring-white"
            >
              <h3 className="font-display text-xl">{t(`${key}Q`)}</h3>
              <p className="mt-2 text-sm text-muted">{t(`${key}A`)}</p>
            </div>
          ))}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
