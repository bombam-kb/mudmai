import { setRequestLocale } from "next-intl/server";
import { HomeDashboard } from "@/components/home-dashboard";
import { requireAppUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { toTodoDto, type GoalOption } from "@/lib/todos/schema";
import { isMoodLevel, type MoodLevel } from "@/lib/mood/schema";
import { findMonthPlan } from "@/lib/month-plan/db";
import { toMonthPlanDto } from "@/lib/month-plan/schema";
import {
  activeCalendarYear,
  calendarParts,
  fromDateOnly,
  localYmd,
} from "@/lib/year";
import type { PillarId } from "@/lib/pillars";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireAppUser(locale);
  if (session.demoMode) {
    return <HomeDashboard name={session.name} demoMode />;
  }

  const { user, name } = session;
  const year = activeCalendarYear();
  const today = localYmd();
  const parts = calendarParts();

  const [yearGoals, todos, todayMood, monthPlan] = await Promise.all([
    prisma.quarterlyGoal
      .findMany({
        where: { userId: user.id, year },
        select: {
          id: true,
          title: true,
          pillar: true,
          quarter: true,
        },
        orderBy: [{ quarter: "asc" }, { createdAt: "asc" }],
      })
      .catch(() => []),
    prisma.dailyTodo
      .findMany({
        where: {
          userId: user.id,
          date: fromDateOnly(today),
        },
        include: { goal: { select: { id: true, title: true, pillar: true } } },
        orderBy: { createdAt: "asc" },
      })
      .catch(() => []),
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
  ]);

  return (
    <HomeDashboard
      name={name}
      todos={todos.map(toTodoDto)}
      mood={todayMood && isMoodLevel(todayMood.level) ? (todayMood.level as MoodLevel) : null}
      monthPlan={monthPlan ? toMonthPlanDto(monthPlan) : null}
      goalOptions={yearGoals.map(
        (goal): GoalOption => ({
          id: goal.id,
          title: goal.title,
          pillar: goal.pillar as PillarId,
          quarter: goal.quarter,
        }),
      )}
    />
  );
}
