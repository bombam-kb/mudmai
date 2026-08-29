"use client";

import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { MobileFold } from "@/components/mobile-fold";
import { RadarChart } from "@/components/reviews/radar-chart";
import { PillarTrendChart } from "@/components/reviews/trend-chart";
import { Link, useRouter } from "@/i18n/navigation";
import { signOutClient } from "@/lib/auth/sign-out-client";
import type { OnboardingRatings } from "@/lib/onboarding/schema";
import type { MonthlyReviewDto, QuarterlyReviewDto } from "@/lib/reviews/schema";
import { EMPTY_RATINGS } from "@/lib/onboarding/schema";
import { calendarParts } from "@/lib/year";
import { useReviewsStore } from "@/stores/reviews-store";
import { PILLARS } from "@/lib/pillars";
import { PillarIcon } from "@/components/icons";

type Props = {
  name: string;
  demoMode: boolean;
  year: number;
  monthly: MonthlyReviewDto[];
  quarterly: QuarterlyReviewDto[];
  baseline?: OnboardingRatings | null;
};

export function ReviewsHub({
  name,
  demoMode,
  year,
  monthly,
  quarterly,
  baseline,
}: Props) {
  const t = useTranslations("reviews");
  const tc = useTranslations("calendar");
  const router = useRouter();
  const storedMonthly = useReviewsStore((state) => state.monthly);
  const storedQuarterly = useReviewsStore((state) => state.quarterly);
  const monthlies = demoMode
    ? storedMonthly.filter((item) => item.year === year)
    : monthly;
  const quarters = demoMode
    ? storedQuarterly.filter((item) => item.year === year)
    : quarterly;
  const { month, quarter } = calendarParts();
  const latest = [...monthlies].sort((a, b) => b.month - a.month)[0];

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  return (
    <AppShell name={name} onSignOut={signOut}>
      <div className="jr-page-head mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-personal">
            {t("eyebrow", { year })}
          </p>
          <h1 className="font-display text-4xl">{t("title")}</h1>
        </div>
        <div className="jr-chip-rail">
          <Link
            href={`/reviews/monthly?year=${year}&month=${month}`}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            {t("writeMonthly")}
          </Link>
          <Link
            href={`/reviews/quarterly?year=${year}&quarter=${quarter}`}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            {t("writeQuarterly")}
          </Link>
        </div>
      </div>

      {demoMode ? (
        <p className="mb-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("demo")}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
          <MobileFold title={t("radarTitle")} preview={<p className="text-sm text-muted">{t("radarHint")}</p>}>
            <p className="text-sm text-muted">{t("radarHint")}</p>
            <RadarChart
              ratings={latest?.ratings ?? baseline ?? EMPTY_RATINGS}
              compare={baseline}
            />
          </MobileFold>
        </section>
        <section className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
          <MobileFold title={t("yearTitle")} preview={<p className="text-sm text-muted">{t("yearHint")}</p>}>
            <p className="text-sm text-muted">{t("yearHint")}</p>
            <div className="jr-chip-rail mt-3 text-xs">
              {PILLARS.map((pillar) => (
                <span key={pillar.id} className="inline-flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: pillar.color }}
                  />
                  <PillarIcon id={pillar.id} size={14} />
                </span>
              ))}
            </div>
            {monthlies.length === 0 ? (
              <p className="mt-4 text-sm text-muted">{t("yearEmpty")}</p>
            ) : (
              <div className="mt-2">
                <PillarTrendChart year={year} reviews={monthlies} />
              </div>
            )}
          </MobileFold>
        </section>
      </div>

      <section className="mt-4 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
        <h2 className="font-display text-2xl">{t("monthlyList")}</h2>
        <div className="jr-rail jr-month-rail mt-3">
          {Array.from({ length: 12 }, (_, index) => {
            const m = index + 1;
            const review = monthlies.find((item) => item.month === m);
            return (
              <Link
                key={m}
                href={`/reviews/monthly?year=${year}&month=${m}`}
                className="rounded-2xl bg-slate-50 px-3 py-3 text-sm font-semibold hover:bg-violet-50"
              >
                {tc(`months.${m}`)}
                <span className="mt-1 block text-xs font-normal text-muted">
                  {review ? t("saved") : t("missing")}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
        <h2 className="font-display text-2xl">{t("quarterlyList")}</h2>
        <div className="jr-rail jr-month-rail mt-3">
          {[1, 2, 3, 4].map((q) => {
            const review = quarters.find((item) => item.quarter === q);
            return (
              <Link
                key={q}
                href={`/reviews/quarterly?year=${year}&quarter=${q}`}
                className="rounded-2xl bg-slate-50 px-3 py-3 text-sm font-semibold hover:bg-violet-50"
              >
                Q{q}
                <span className="mt-1 block text-xs font-normal text-muted">
                  {review ? t("saved") : t("missing")}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
