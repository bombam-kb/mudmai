"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { MobileFold } from "@/components/mobile-fold";
import { PillarHighlight } from "@/components/pillars/highlight";
import { TodayTodos } from "@/components/todos/today-todos";
import { MonthPlanCard } from "@/components/month-plan/month-plan-card";
import { NudgeCards } from "@/components/nudge/nudge-cards";
import { signOutClient } from "@/lib/auth/sign-out-client";
import { PILLARS, type PillarId } from "@/lib/pillars";
import { PillarIcon } from "@/components/icons";
import { PillarLegend } from "@/components/pillars/legend";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useRemindersStore } from "@/stores/reminders-store";
import { useReviewsStore } from "@/stores/reviews-store";
import {
  calendarParts,
  isMonthlyReviewWindow,
  isQuarterlyReviewWindow,
} from "@/lib/year";
import { useTranslations } from "next-intl";
import type { OnboardingRatings } from "@/lib/onboarding/schema";
import type { GoalOption, TodoDto } from "@/lib/todos/schema";
import type { ReminderLogDto } from "@/lib/reminders/schema";
import type { MoodLevel } from "@/lib/mood/schema";
import type { MonthPlanDto } from "@/lib/month-plan/schema";
import type { NudgeDto } from "@/lib/nudge/schema";
import { LineNotifyBanner, type LineNotifyState } from "@/components/line/notify-banner";

type ReflectionCard = {
  healingThings: string;
  happiestMoment: string;
  expectationsNextYear: string;
  lastYearStory: string;
  ratings: OnboardingRatings;
};

type Props = {
  name: string;
  reflection?: ReflectionCard | null;
  demoMode?: boolean;
  currentQuarter?: number;
  quarterGoals?: Array<{
    id: string;
    title: string;
    pillar: PillarId;
    progress: number;
  }>;
  todos?: TodoDto[];
  goalOptions?: GoalOption[];
  latestReminders?: ReminderLogDto[];
  unreadCount?: number;
  monthlyDue?: boolean;
  quarterlyDue?: boolean;
  mood?: MoodLevel | null;
  monthPlan?: MonthPlanDto | null;
  nudges?: NudgeDto[];
  line?: LineNotifyState | null;
};

export function HomeDashboard({
  name,
  reflection,
  demoMode,
  currentQuarter,
  quarterGoals = [],
  todos = [],
  goalOptions = [],
  latestReminders = [],
  unreadCount = 0,
  monthlyDue,
  quarterlyDue,
  mood = null,
  monthPlan = null,
  nudges = [],
  line = null,
}: Props) {
  const t = useTranslations("home");
  const tp = useTranslations("pillars");
  const router = useRouter();
  const completed = useOnboardingStore((state) => state.completed);
  const storeHealing = useOnboardingStore((state) => state.healingThings);
  const storeExpect = useOnboardingStore((state) => state.expectationsNextYear);
  const storeHappiest = useOnboardingStore((state) => state.happiestMoment);
  const storeRatings = useOnboardingStore((state) => state.ratings);

  const localReflection =
    !reflection && completed
      ? {
          healingThings: storeHealing,
          expectationsNextYear: storeExpect,
          lastYearStory: "",
          happiestMoment: storeHappiest,
          ratings: storeRatings,
        }
      : null;

  const shown = reflection ?? localReflection;
  const storedMonthly = useReviewsStore((state) => state.monthly);
  const storedQuarterly = useReviewsStore((state) => state.quarterly);
  const parts = calendarParts();
  const monthDue =
    monthlyDue ??
    (Boolean(demoMode) &&
      isMonthlyReviewWindow() &&
      !storedMonthly.some(
        (item) => item.year === parts.year && item.month === parts.month,
      ));
  const quarterDue =
    quarterlyDue ??
    (Boolean(demoMode) &&
      isQuarterlyReviewWindow() &&
      !storedQuarterly.some(
        (item) => item.year === parts.year && item.quarter === parts.quarter,
      ));

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  return (
    <AppShell name={name} onSignOut={signOut}>
      <p className="jr-mobile-only mb-4 font-display text-[1.75rem] leading-tight text-ink">
        {t("hello", { name })}
      </p>

      <div className="space-y-4">
        <LineNotifyBanner demoMode={demoMode} line={line} />
        <TodayTodos
          demoMode={demoMode}
          initialTodos={todos}
          goals={goalOptions}
          initialMood={mood}
        />

        <NudgeCards
          demoMode={demoMode}
          initialNudges={nudges}
          reflection={shown}
        />

        <section className="rounded-[2rem] bg-white p-5 shadow-card ring-1 ring-slate-100 sm:p-6">
          <PillarHighlight ratings={shown?.ratings} />
        </section>

        <MonthPlanCard
          year={parts.year}
          month={parts.month}
          demoMode={demoMode}
          initialPlan={monthPlan}
        />

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-sm text-muted">{t("pillarHint")}</p>
            <PillarLegend variant="dots" />
          </div>
          <div className="jr-home-shortcuts">
            <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100">
            <h2 className="font-display text-2xl">{t("goalsCard")}</h2>
            <p className="mt-2 text-sm text-muted">{t("goalsCardBody")}</p>
            {quarterGoals.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm">
                {quarterGoals.slice(0, 3).map((goal) => (
                  <li key={goal.id} className="flex justify-between gap-2">
                    <span className="line-clamp-1 inline-flex min-w-0 items-center gap-1">
                      <PillarIcon id={goal.pillar} size={14} /> {goal.title}
                    </span>
                    <span className="shrink-0 text-muted">
                      {Math.round(goal.progress)}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : currentQuarter ? (
              <p className="mt-3 text-sm text-muted">Q{currentQuarter}</p>
            ) : null}
            <Link
              href="/goals"
              title={tp("career")}
              aria-label={`${t("openGoals")} — ${tp("career")}`}
              className="mt-4 inline-flex rounded-full bg-career px-4 py-2 text-sm font-semibold text-white"
            >
              {t("openGoals")}
            </Link>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100">
            <h2 className="font-display text-2xl">{t("visionCard")}</h2>
            <p className="mt-2 text-sm text-muted">{t("visionCardBody")}</p>
            <Link
              href="/vision"
              title={tp("personal")}
              aria-label={`${t("openVision")} — ${tp("personal")}`}
              className="mt-4 inline-flex rounded-full bg-personal px-4 py-2 text-sm font-semibold text-white"
            >
              {t("openVision")}
            </Link>
          </section>

          <HomeReminders
            demoMode={demoMode}
            latestReminders={latestReminders}
            unreadCount={unreadCount}
          />

          <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100">
            <h2 className="font-display text-2xl">{t("reviewsCard")}</h2>
            <p className="mt-2 text-sm text-muted">{t("reviewsCardBody")}</p>
            {monthDue ? (
              <p className="mt-2 text-sm font-semibold text-brand">{t("monthlyDue")}</p>
            ) : null}
            {quarterDue ? (
              <p className="mt-2 text-sm font-semibold text-personal">
                {t("quarterlyDue")}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/reviews"
                className="inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
              >
                {t("openReviews")}
              </Link>
              <Link
                href="/reminders"
                className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-ink"
              >
                {t("openReminders")}
              </Link>
            </div>
          </section>
          </div>
        </div>

        {shown ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
              <MobileFold
                title={t("healingTitle")}
                preview={
                  <p className="line-clamp-2 text-sm text-muted">{shown.healingThings}</p>
                }
              >
                <p className="text-sm text-muted">{shown.healingThings}</p>
                <Link
                  href="/onboarding"
                  className="mt-3 inline-flex text-sm font-semibold text-brand"
                >
                  {t("editReflection")}
                </Link>
              </MobileFold>
            </section>
            <section className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100 lg:col-span-2">
              <MobileFold
                title={t("expectTitle")}
                preview={
                  <p className="line-clamp-2 text-sm text-muted">
                    {shown.expectationsNextYear}
                  </p>
                }
              >
                <p className="text-muted">{shown.expectationsNextYear}</p>
              </MobileFold>
            </section>
            <section className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100 lg:col-span-3">
              <MobileFold title={t("reflectionTitle")}>
                <div className="jr-rail jr-rating-rail">
                  {PILLARS.map((pillar) => (
                    <RatingBar
                      key={pillar.id}
                      id={pillar.id}
                      value={shown.ratings[pillar.id]}
                      color={pillar.color}
                    />
                  ))}
                </div>
              </MobileFold>
            </section>
          </div>
        ) : (
          <section className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
            <h2 className="font-display text-2xl">{t("reflectionTitle")}</h2>
            <p className="mt-2 text-sm text-muted">{t("phaseNote")}</p>
            <Link
              href="/onboarding"
              className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
            >
              {t("startOnboarding")}
            </Link>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function RatingBar({
  id,
  value,
  color,
}: {
  id: PillarId;
  value: number;
  color: string;
}) {
  const t = useTranslations("pillars");
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));

  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold">
        <span className="inline-flex items-center gap-1.5">
          <PillarIcon id={id} size={16} /> {t(id)}
        </span>
        <span className="text-muted">{value}/5</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function HomeReminders({
  demoMode,
  latestReminders,
  unreadCount,
}: {
  demoMode?: boolean;
  latestReminders: ReminderLogDto[];
  unreadCount: number;
}) {
  const t = useTranslations("home");
  const stored = useRemindersStore((state) => state.logs);
  const logs = demoMode ? stored.slice(0, 2) : latestReminders;
  const unread = demoMode ? stored.filter((log) => !log.isRead).length : unreadCount;
  const latest = logs[0];

  return (
    <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100">
      <h2 className="font-display text-2xl">{t("reminders")}</h2>
      <p className="mt-2 text-sm text-muted">
        {unread > 0 ? t("unreadReminders", { count: unread }) : t("remindersClear")}
      </p>
      {latest ? (
        <p className="mt-2 line-clamp-2 text-sm font-semibold">{latest.title}</p>
      ) : null}
      <Link
        href="/reminders"
        className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
      >
        {t("openReminders")}
      </Link>
    </section>
  );
}
