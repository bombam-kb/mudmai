import { prisma } from "@/lib/prisma";
import { isMonthPlanFilled, toMonthPlanDto } from "@/lib/month-plan/schema";
import { sentKey, type ReminderKind } from "@/lib/reminders/kinds";
import type { ReminderFacts, ReminderTask } from "@/lib/reminders/engine";
import {
  bangkokClock,
  fromDateOnly,
  mondayWeekBounds,
  shiftYearMonth,
  shiftYearQuarter,
} from "@/lib/year";

function asTask(row: { title: string; date: Date | string; isCompleted: boolean }): ReminderTask {
  const date = typeof row.date === "string" ? row.date.slice(0, 10) : row.date.toISOString().slice(0, 10);
  return { title: row.title, date, isCompleted: row.isCompleted };
}

export async function loadReminderFacts(userId: string, now = new Date()): Promise<ReminderFacts> {
  const clock = bangkokClock(now);
  const week = mondayWeekBounds(clock.ymd);
  const nextMonth = shiftYearMonth(clock.year, clock.month, 1);
  const nextQuarter = shiftYearQuarter(clock.year, clock.quarter, 1);

  const [todos, monthPlan, nextPlan, quarterCount, nextQuarterCount, monthly, quarterly, recentLogs] =
    await Promise.all([
      prisma.dailyTodo.findMany({
        where: {
          userId,
          date: { gte: fromDateOnly(week.start), lte: fromDateOnly(week.end) },
        },
        select: { title: true, date: true, isCompleted: true },
        orderBy: { date: "asc" },
      }),
      prisma.monthlyPlan.findUnique({
        where: { userId_year_month: { userId, year: clock.year, month: clock.month } },
      }),
      prisma.monthlyPlan.findUnique({
        where: {
          userId_year_month: { userId, year: nextMonth.year, month: nextMonth.month },
        },
      }),
      prisma.quarterlyGoal.count({
        where: { userId, year: clock.year, quarter: clock.quarter },
      }),
      prisma.quarterlyGoal.count({
        where: { userId, year: nextQuarter.year, quarter: nextQuarter.quarter },
      }),
      prisma.monthlyReview.findUnique({
        where: { userId_year_month: { userId, year: clock.year, month: clock.month } },
        select: { id: true },
      }),
      prisma.quarterlyReview.findUnique({
        where: {
          userId_year_quarter: { userId, year: clock.year, quarter: clock.quarter },
        },
        select: { id: true },
      }),
      prisma.reminderLog.findMany({
        where: { userId, sentAt: { gte: fromDateOnly(week.start) } },
        select: { kind: true, sentAt: true },
      }),
    ]);

  const tasks = todos.map(asTask);
  const sent = new Set<string>();
  for (const log of recentLogs) {
    sent.add(sentKey(log.kind as ReminderKind, log.sentAt));
  }

  return {
    enabled: true,
    weekTodoCount: tasks.length,
    today: tasks.filter((todo) => todo.date === clock.ymd),
    week: tasks,
    monthPlanned: isMonthPlanFilled(monthPlan ? toMonthPlanDto(monthPlan) : null),
    nextMonthPlanned: isMonthPlanFilled(nextPlan ? toMonthPlanDto(nextPlan) : null),
    quarterPlanned: quarterCount > 0,
    nextQuarterPlanned: nextQuarterCount > 0,
    monthlyReviewDone: Boolean(monthly),
    quarterlyReviewDone: Boolean(quarterly),
    sent,
  };
}

export function factsFromLocal(input: {
  enabled: boolean;
  todos: Array<{ title: string; date: string; isCompleted: boolean }>;
  monthPlanned: boolean;
  nextMonthPlanned: boolean;
  quarterPlanned: boolean;
  nextQuarterPlanned: boolean;
  monthlyReviewDone: boolean;
  quarterlyReviewDone: boolean;
  sent: Set<string>;
  now?: Date;
}): ReminderFacts {
  const clock = bangkokClock(input.now ?? new Date());
  const week = mondayWeekBounds(clock.ymd);
  const tasks = input.todos.filter((todo) => todo.date >= week.start && todo.date <= week.end);
  return {
    enabled: input.enabled,
    weekTodoCount: tasks.length,
    today: tasks.filter((todo) => todo.date === clock.ymd),
    week: tasks,
    monthPlanned: input.monthPlanned,
    nextMonthPlanned: input.nextMonthPlanned,
    quarterPlanned: input.quarterPlanned,
    nextQuarterPlanned: input.nextQuarterPlanned,
    monthlyReviewDone: input.monthlyReviewDone,
    quarterlyReviewDone: input.quarterlyReviewDone,
    sent: input.sent,
  };
}
