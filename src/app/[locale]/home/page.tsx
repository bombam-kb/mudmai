import { setRequestLocale } from "next-intl/server";
import { HomeDashboard } from "@/components/home-dashboard";
import { requireAppUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { toTodoDto, type GoalOption } from "@/lib/todos/schema";
import { goalProgressPercent } from "@/lib/pillars";
import { toLogDto } from "@/lib/reminders/schema";
import { isMoodLevel, type MoodLevel } from "@/lib/mood/schema";
import { findMonthPlan } from "@/lib/month-plan/db";
import { toMonthPlanDto } from "@/lib/month-plan/schema";
import {
  activeCalendarYear,
  calendarParts,
  currentQuarter,
  fromDateOnly,
  isMonthlyReviewWindow,
  isQuarterlyReviewWindow,
  localYmd,
  shiftYmd,
} from "@/lib/year";
import type { PillarId } from "@/lib/pillars";
import { toNudgeDto } from "@/lib/nudge/schema";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireAppUser(locale, { withReflection: true });
  if (session.demoMode) {
    return (
      <HomeDashboard
        name={session.name}
        demoMode
      />
    );
  }

  const { user, reflection, name } = session;
  const year = activeCalendarYear();
  const quarter = currentQuarter();
  const today = localYmd();
  const weekFrom = shiftYmd(today, -6);
  const parts = calendarParts();

  const [yearGoals, todos, reminderLogs, monthlyReview, quarterlyReview, todayMood, monthPlan, nudges] =
    await Promise.all([
      prisma.quarterlyGoal
        .findMany({
          where: { userId: user.id, year },
          select: {
            id: true,
            title: true,
            pillar: true,
            quarter: true,
            currentValue: true,
            targetValue: true,
          },
          orderBy: [{ quarter: "asc" }, { createdAt: "asc" }],
        })
        .catch(() => []),
      prisma.dailyTodo
        .findMany({
          where: {
            userId: user.id,
            date: { gte: fromDateOnly(weekFrom), lte: fromDateOnly(today) },
          },
          include: { goal: { select: { id: true, title: true, pillar: true } } },
          orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        })
        .catch(() => []),
      prisma.reminderLog
        .findMany({
          where: { userId: user.id, isRead: false },
          orderBy: { sentAt: "desc" },
          take: 2,
        })
        .catch(() => []),
      prisma.monthlyReview
        .findUnique({
          where: {
            userId_year_month: {
              userId: user.id,
              year: parts.year,
              month: parts.month,
            },
          },
        })
        .catch(() => null),
      prisma.quarterlyReview
        .findUnique({
          where: {
            userId_year_quarter: {
              userId: user.id,
              year: parts.year,
              quarter: parts.quarter,
            },
          },
        })
        .catch(() => null),
      prisma.dailyMood
        ? prisma.dailyMood
            .findUnique({
              where: {
                userId_date: { userId: user.id, date: fromDateOnly(today) },
              },
            })
            .catch(() => null)
        : Promise.resolve(null),
      findMonthPlan(user.id, parts.year, parts.month),
      prisma.aiNudgeLog
        .findMany({
          where: { userId: user.id, isRead: false },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
        .catch(() => []),
    ]);

  const quarterGoals = yearGoals.filter((goal) => goal.quarter === quarter);

  return (
    <HomeDashboard
      name={name}
      currentQuarter={quarter}
      todos={todos.map(toTodoDto)}
      latestReminders={reminderLogs.map(toLogDto)}
      unreadCount={reminderLogs.length}
      monthlyDue={!monthlyReview && isMonthlyReviewWindow()}
      quarterlyDue={!quarterlyReview && isQuarterlyReviewWindow()}
      mood={todayMood && isMoodLevel(todayMood.level) ? (todayMood.level as MoodLevel) : null}
      monthPlan={monthPlan ? toMonthPlanDto(monthPlan) : null}
      nudges={nudges.map(toNudgeDto)}
      goalOptions={yearGoals.map(
        (goal): GoalOption => ({
          id: goal.id,
          title: goal.title,
          pillar: goal.pillar as PillarId,
          quarter: goal.quarter,
        }),
      )}
      quarterGoals={quarterGoals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        pillar: goal.pillar as PillarId,
        progress: goalProgressPercent(goal.currentValue, goal.targetValue),
      }))}
      reflection={
        reflection
          ? {
              healingThings: reflection.healingThings,
              happiestMoment: reflection.happiestMoment,
              expectationsNextYear: reflection.expectationsNextYear,
              lastYearStory: reflection.lastYearStory,
              ratings: {
                CAREER: reflection.ratingCareer,
                PERSONAL: reflection.ratingPersonal,
                FINANCE: reflection.ratingFinance,
                RELATIONSHIPS: reflection.ratingRelationships,
                MENTAL_HEALTH: reflection.ratingMental,
                PHYSICAL_HEALTH: reflection.ratingPhysical,
              },
            }
          : null
      }
    />
  );
}
