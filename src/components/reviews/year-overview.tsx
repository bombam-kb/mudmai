"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MonthMemoryThumb } from "@/components/reviews/month-memory-board";
import { PillarIcon } from "@/components/icons";
import {
  computeYearPushPlan,
  formatScore,
  healthStyle,
  pillarStatuses,
  type MonthHealth,
  type MonthScore,
  type PillarAverage,
  type PillarRatingStatus,
  type YearReviewStats,
} from "@/lib/reviews/analytics";

type Props = {
  year: number;
  stats: YearReviewStats;
  monthLabel: (month: number) => string;
};

export function YearOverview({ year, stats, monthLabel }: Props) {
  const t = useTranslations("reviews.overview");
  const tp = useTranslations("pillars");
  const pushPlan = computeYearPushPlan(stats);

  const scoreByMonth = new Map(stats.monthScores.map((item) => [item.month, item]));
  const ytdStyle = healthStyle(stats.ytdHealth);

  return (
    <section className="jr-review-overview rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {t("eyebrow", { year })}
          </p>
          <h2 className="font-display text-2xl text-ink">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("hint")}</p>
        </div>
        <ScoreStatusBadge health={stats.ytdHealth} size="lg" />
      </div>

      <div className="jr-review-stat-row mt-5">
        <StatCard
          label={t("ytdAverage")}
          value={formatScore(stats.ytdAverage)}
          sub={t("statusLabel", { status: t(`status.${stats.ytdHealth}`) })}
          accent={ytdStyle.border}
        />
        <StatCard
          label={t("completed")}
          value={`${stats.completedMonths}/12`}
          sub={t("months")}
        />
        <StatCard
          label={t("latestTrend")}
          value={
            stats.latestDelta === null
              ? "—"
              : `${stats.latestDelta > 0 ? "+" : ""}${formatScore(stats.latestDelta)}`
          }
          sub={
            stats.latestDelta === null
              ? t("firstMonth")
              : stats.latestDelta >= 0.15
                ? t("improving")
                : stats.latestDelta <= -0.15
                  ? t("declining")
                  : t("steady")
          }
          accent={
            stats.latestDelta === null
              ? undefined
              : stats.latestDelta >= 0.15
                ? "rgb(16 185 129)"
                : stats.latestDelta <= -0.15
                  ? "rgb(239 68 68)"
                  : undefined
          }
        />
      </div>

      <PushPlanCard plan={pushPlan} />

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("tapestry")}</p>
        <div className="jr-review-tapestry mt-2" role="img" aria-label={t("tapestryAria")}>
          {Array.from({ length: 12 }, (_, index) => {
            const month = index + 1;
            const entry = scoreByMonth.get(month);
            if (!entry) {
              return (
                <div
                  key={month}
                  className="jr-review-tapestry-cell is-empty"
                  title={monthLabel(month)}
                >
                  <span className="jr-review-tapestry-num">{month}</span>
                </div>
              );
            }
            const style = healthStyle(entry.health);
            return (
              <div
                key={month}
                className="jr-review-tapestry-cell"
                style={{
                  background: style.bg,
                  boxShadow: `inset 0 0 0 1px ${style.border}`,
                }}
                title={`${monthLabel(month)} · ${formatScore(entry.score)} · ${t(`status.${entry.health}`)}`}
              >
                <span className="jr-review-tapestry-num" style={{ color: style.text }}>
                  {month}
                </span>
                {entry.delta !== null && Math.abs(entry.delta) >= 0.15 ? (
                  <span
                    className={`jr-review-tapestry-delta ${entry.delta > 0 ? "is-up" : "is-down"}`}
                    aria-hidden
                  >
                    {entry.delta > 0 ? "↑" : "↓"}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <ul className="jr-review-legend mt-3">
          {(["critical", "low", "neutral", "good", "great"] as MonthHealth[]).map((health) => (
            <li key={health}>
              <span className={`jr-review-legend-swatch is-${health}`} />
              {t(`status.${health}`)}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {stats.bestMonth ? (
          <HighlightCard
            title={t("bestMonth")}
            monthLabel={monthLabel(stats.bestMonth.month)}
            score={stats.bestMonth.score}
            health={stats.bestMonth.health}
          />
        ) : null}
        {stats.toughestMonth ? (
          <HighlightCard
            title={t("toughMonth")}
            monthLabel={monthLabel(stats.toughestMonth.month)}
            score={stats.toughestMonth.score}
            health={stats.toughestMonth.health}
          />
        ) : null}
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t("pillarAverage")}
        </p>
        <p className="mt-1 text-sm text-muted">{t("pillarAverageHint")}</p>
        <ul className="jr-review-pillar-status mt-3">
          {stats.pillarAverages.map((item) => (
            <PillarStatusRow key={item.id} pillar={item} label={tp(item.id)} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function PushPlanCard({ plan }: { plan: ReturnType<typeof computeYearPushPlan> }) {
  const t = useTranslations("reviews.overview");
  const tp = useTranslations("pillars");

  if (plan.reviewsRemaining === 0) {
    return (
      <div className="jr-review-push mt-5 is-done">
        <p className="font-semibold text-ink">{t("pushDoneTitle")}</p>
        <p className="mt-1 text-sm text-muted">
          {t("pushDoneBody", {
            score: formatScore(plan.currentAverage),
            status: t(`status.${plan.currentHealth}`),
          })}
        </p>
      </div>
    );
  }

  if (!plan.needsPush) {
    return (
      <div className="jr-review-push mt-5 is-on-track">
        <p className="font-semibold text-ink">{t("pushOnTrackTitle")}</p>
        <p className="mt-1 text-sm text-muted">
          {t("pushOnTrackBody", {
            score: formatScore(plan.currentAverage),
            target: formatScore(plan.targetScore),
          })}
        </p>
      </div>
    );
  }

  const style = healthStyle(plan.currentHealth);

  return (
    <div
      className="jr-review-push mt-5"
      style={{ background: style.bg, boxShadow: `inset 0 0 0 1px ${style.border}` }}
    >
      <p className="font-display text-lg font-semibold text-ink">{t("pushTitle")}</p>
      <p className="mt-1 text-sm" style={{ color: style.text }}>
        {t("pushBody", {
          current: formatScore(plan.currentAverage),
          target: formatScore(plan.targetScore),
          gap: formatScore(Math.max(0, plan.gap)),
          remaining: plan.reviewsRemaining,
          required:
            plan.requiredPerReview !== null ? formatScore(plan.requiredPerReview) : "—",
        })}
      </p>
      {plan.weakestPillars.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("pushFocus")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {plan.weakestPillars.map((pillar) => (
              <li key={pillar.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  <PillarIcon id={pillar.id} size={14} />
                  {tp(pillar.id)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="font-semibold">{formatScore(pillar.average)}</span>
                  <ScoreStatusBadge health={pillar.health} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ScoreStatusBadge({
  health,
  size = "sm",
}: {
  health: MonthHealth;
  size?: "sm" | "lg";
}) {
  const t = useTranslations("reviews.overview");
  const style = healthStyle(health);
  return (
    <span
      className={`jr-review-status ${size === "lg" ? "is-lg" : ""}`}
      style={{ color: style.text, background: style.bg, boxShadow: `inset 0 0 0 1px ${style.border}` }}
    >
      {t(`status.${health}`)}
    </span>
  );
}

function PillarStatusRow({ pillar, label }: { pillar: PillarAverage; label: string }) {
  const style = healthStyle(pillar.health);
  return (
    <li className="jr-review-pillar-status-row">
      <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink">
        <PillarIcon id={pillar.id} size={16} />
        <span className="truncate">{label}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-2">
        <span className="font-display text-lg font-semibold" style={{ color: style.text }}>
          {formatScore(pillar.average)}
        </span>
        <ScoreStatusBadge health={pillar.health} />
      </span>
    </li>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="jr-review-stat-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p
        className="mt-1 font-display text-3xl font-semibold text-ink"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  );
}

function HighlightCard({
  title,
  monthLabel,
  score,
  health,
}: {
  title: string;
  monthLabel: string;
  score: number;
  health: MonthScore["health"];
}) {
  const t = useTranslations("reviews.overview");
  const style = healthStyle(health);
  return (
    <div
      className="jr-review-highlight"
      style={{ background: style.bg, boxShadow: `inset 0 0 0 1px ${style.border}` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: style.text }}>
        {title}
      </p>
      <p className="mt-1 font-display text-xl font-semibold text-ink">{monthLabel}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold" style={{ color: style.text }}>
          {formatScore(score)} / 5 · {t("overallShort")}
        </p>
        <ScoreStatusBadge health={health} />
      </div>
    </div>
  );
}

function PillarStatusList({ items }: { items: PillarRatingStatus[] }) {
  const tp = useTranslations("pillars");
  const t = useTranslations("reviews.overview");
  return (
    <ul className="jr-review-month-pillars mt-2">
      {items.map((item) => {
        const style = healthStyle(item.health);
        return (
          <li key={item.id} className="jr-review-month-pillar">
            <span className="inline-flex min-w-0 items-center gap-1 truncate text-[0.68rem] font-medium text-ink/80">
              <PillarIcon id={item.id} size={12} />
              {tp(item.id)}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1">
              <span className="text-[0.68rem] font-bold" style={{ color: style.text }}>
                {formatScore(item.score)}
              </span>
              <span
                className="jr-review-status is-xs"
                style={{
                  color: style.text,
                  background: style.bg,
                  boxShadow: `inset 0 0 0 1px ${style.border}`,
                }}
              >
                {t(`status.${item.health}`)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function MonthScoreTile({
  monthLabel,
  href,
  reflexHref,
  entry,
  memoryImageUrl,
  memoryCaption,
}: {
  monthLabel: string;
  href: string;
  reflexHref?: string;
  entry: MonthScore | undefined;
  memoryImageUrl?: string;
  memoryCaption?: string;
}) {
  const t = useTranslations("reviews");
  const tr = useTranslations("reviews.reflex");
  const to = useTranslations("reviews.overview");

  if (!entry) {
    return (
      <Link href={href} className="jr-review-month-tile is-missing">
        <span className="font-semibold">{monthLabel}</span>
        <span className="mt-1 block text-xs font-normal text-muted">{t("missing")}</span>
      </Link>
    );
  }

  const style = healthStyle(entry.health);
  const improving = entry.delta !== null && entry.delta >= 0.15;
  const declining = entry.delta !== null && entry.delta <= -0.15;
  const pillars = pillarStatuses(entry.ratings);

  return (
    <div
      className={`jr-review-month-tile ${improving ? "is-improving" : ""} ${declining ? "is-declining" : ""}`}
      style={{
        background: style.bg,
        boxShadow: `inset 0 0 0 1px ${style.border}`,
      }}
    >
      <Link href={href} className="block text-inherit no-underline">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="font-semibold text-ink">{monthLabel}</span>
            <div className="mt-1">
              <ScoreStatusBadge health={entry.health} />
            </div>
          </div>
          <div className="text-right">
            <span className="jr-review-month-score block" style={{ color: style.text }}>
              {formatScore(entry.score)}
            </span>
            <span className="text-[0.65rem] text-muted">{to("overallShort")}</span>
          </div>
        </div>
        <PillarStatusList items={pillars} />
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span style={{ color: style.text }}>{t("saved")}</span>
          {entry.delta !== null && Math.abs(entry.delta) >= 0.15 ? (
            <span className={improving ? "text-finance" : "text-physical"}>
              {improving ? "↑" : "↓"} {formatScore(Math.abs(entry.delta))}
            </span>
          ) : null}
        </div>
      </Link>
      {memoryImageUrl ? (
        <MonthMemoryThumb imageUrl={memoryImageUrl} caption={memoryCaption} />
      ) : null}
      {reflexHref ? (
        <Link href={reflexHref} className="jr-reflex-chip mt-3">
          {tr("watch")}
        </Link>
      ) : null}
    </div>
  );
}

export function useMonthLabel() {
  const tc = useTranslations("calendar");
  return (month: number) => tc(`months.${month}`);
}
