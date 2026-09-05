"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { MobileFold } from "@/components/mobile-fold";
import { RadarChart } from "@/components/reviews/radar-chart";
import { PillarTrendChart } from "@/components/reviews/trend-chart";
import {
  MonthScoreTile,
  ScoreStatusBadge,
  useMonthLabel,
  YearOverview,
} from "@/components/reviews/year-overview";
import { Link, useRouter } from "@/i18n/navigation";
import { signOutClient } from "@/lib/auth/sign-out-client";
import type { OnboardingRatings } from "@/lib/onboarding/schema";
import type { MonthPlanDto } from "@/lib/month-plan/schema";
import type { MonthlyReviewDto, QuarterlyReviewDto } from "@/lib/reviews/schema";
import { EMPTY_RATINGS } from "@/lib/onboarding/schema";
import { averageRating, computeYearStats, formatScore, healthStyle, monthHealth, monthScoreMap } from "@/lib/reviews/analytics";
import { calendarParts } from "@/lib/year";
import { useMonthPlanStore } from "@/stores/month-plan-store";
import { useReviewsStore } from "@/stores/reviews-store";
import { PILLARS } from "@/lib/pillars";
import { PillarIcon } from "@/components/icons";
import { VisionEntry } from "@/components/vision/vision-entry";

type Props = {
  name: string;
  demoMode: boolean;
  year: number;
  monthly: MonthlyReviewDto[];
  quarterly: QuarterlyReviewDto[];
  monthPlans?: MonthPlanDto[];
  baseline?: OnboardingRatings | null;
};

export function ReviewsHub({
  name,
  demoMode,
  year,
  monthly,
  quarterly,
  monthPlans = [],
  baseline,
}: Props) {
  const t = useTranslations("reviews");
  const router = useRouter();
  const monthLabel = useMonthLabel();
  const storedMonthly = useReviewsStore((state) => state.monthly);
  const storedQuarterly = useReviewsStore((state) => state.quarterly);
  const storedPlans = useMonthPlanStore((state) => state.plans);
  const monthlies = demoMode
    ? storedMonthly.filter((item) => item.year === year)
    : monthly;
  const quarters = demoMode
    ? storedQuarterly.filter((item) => item.year === year)
    : quarterly;
  const plans = demoMode
    ? storedPlans.filter((item) => item.year === year)
    : monthPlans;
  const planByMonth = new Map(plans.map((plan) => [plan.month, plan]));
  const { month, quarter } = calendarParts();
  const latest = [...monthlies].sort((a, b) => b.month - a.month)[0];
  const yearStats = useMemo(() => computeYearStats(monthlies), [monthlies]);
  const scoresByMonth = useMemo(() => monthScoreMap(yearStats), [yearStats]);

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  return (
    <AppShell name={name} onSignOut={signOut}>
      <div className="jr-page-head mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-personal">
            {t("eyebrow", { year })}
          </p>
          <h1 className="font-display text-4xl">{t("title")}</h1>
        </div>
        <div className="jr-reviews-cta">
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
          {latest ? (
            <Link
              href={`/reviews/reflex?year=${year}&month=${latest.month}`}
              className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-semibold text-brand"
            >
              {t("reflex.watch")}
            </Link>
          ) : null}
        </div>
      </div>

      {demoMode ? (
        <p className="mb-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("demo")}
        </p>
      ) : null}

      <VisionEntry />

      {yearStats ? (
        <div className="mb-4">
          <YearOverview year={year} stats={yearStats} monthLabel={monthLabel} />
        </div>
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
            <div className="jr-pillar-legend mt-3 text-xs">
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
        {yearStats ? (
          <p className="mt-1 text-sm text-muted">{t("overview.monthListHint")}</p>
        ) : null}
        <div className="jr-month-grid mt-3">
          {Array.from({ length: 12 }, (_, index) => {
            const m = index + 1;
            return (
              <MonthScoreTile
                key={m}
                monthLabel={monthLabel(m)}
                href={`/reviews/monthly?year=${year}&month=${m}`}
                reflexHref={
                  scoresByMonth.get(m)
                    ? `/reviews/reflex?year=${year}&month=${m}`
                    : undefined
                }
                entry={scoresByMonth.get(m)}
                memoryImageUrl={planByMonth.get(m)?.memoryImageUrl ?? undefined}
                memoryCaption={planByMonth.get(m)?.memoryCaption}
              />
            );
          })}
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
        <h2 className="font-display text-2xl">{t("quarterlyList")}</h2>
        <div className="jr-month-grid mt-3">
          {[1, 2, 3, 4].map((q) => {
            const review = quarters.find((item) => item.quarter === q);
            if (!review) {
              return (
                <Link
                  key={q}
                  href={`/reviews/quarterly?year=${year}&quarter=${q}`}
                  className="jr-review-month-tile is-missing"
                >
                  Q{q}
                  <span className="mt-1 block text-xs font-normal text-muted">{t("missing")}</span>
                </Link>
              );
            }
            const score = averageRating(review.ratings);
            const style = healthStyle(monthHealth(score));
            return (
              <Link
                key={q}
                href={`/reviews/quarterly?year=${year}&quarter=${q}`}
                className="jr-review-month-tile"
                style={{
                  background: style.bg,
                  boxShadow: `inset 0 0 0 1px ${style.border}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-ink">Q{q}</span>
                    <div className="mt-1">
                      <ScoreStatusBadge health={monthHealth(score)} />
                    </div>
                  </div>
                  <span className="jr-review-month-score" style={{ color: style.text }}>
                    {formatScore(score)}
                  </span>
                </div>
                <span className="mt-2 block text-xs" style={{ color: style.text }}>
                  {t("saved")}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
