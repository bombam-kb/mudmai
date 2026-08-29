import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { toGoalDto } from "@/lib/goals/schema";
import { toTodoDto } from "@/lib/todos/schema";
import { toMonthlyDto, toQuarterlyDto } from "@/lib/reviews/schema";
import { listMonthPlans } from "@/lib/month-plan/db";
import { toMonthPlanDto } from "@/lib/month-plan/schema";
import { toNudgeDto } from "@/lib/nudge/schema";
import { toPrefDto } from "@/lib/reminders/schema";
import { rateLimitJson } from "@/lib/http/rate-limit";
import { activeCalendarYear, fromDateOnly, toDateOnly } from "@/lib/year";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`export:${user.id}`, 20);
  if (limited) return limited;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year") ?? activeCalendarYear());

  const [profile, reflection, goals, todos, moods, monthPlans, monthly, quarterly, prefs, nudges, lineAccount] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true, name: true, preferredLocale: true, timezone: true },
      }),
      prisma.pastYearReflection.findUnique({
        where: { userId_year: { userId: user.id, year } },
      }),
      prisma.quarterlyGoal.findMany({
        where: { userId: user.id, year },
        include: { milestones: { orderBy: { order: "asc" } } },
      }),
      prisma.dailyTodo.findMany({
        where: {
          userId: user.id,
          date: {
            gte: fromDateOnly(`${year}-01-01`),
            lte: fromDateOnly(`${year}-12-31`),
          },
        },
        include: { goal: { select: { id: true, title: true, pillar: true } } },
        orderBy: { date: "asc" },
      }),
      prisma.dailyMood
        ? prisma.dailyMood.findMany({
            where: {
              userId: user.id,
              date: {
                gte: fromDateOnly(`${year}-01-01`),
                lte: fromDateOnly(`${year}-12-31`),
              },
            },
            orderBy: { date: "asc" },
          })
        : Promise.resolve([]),
      listMonthPlans(user.id, year),
      prisma.monthlyReview.findMany({
        where: { userId: user.id, year },
        orderBy: { month: "asc" },
      }),
      prisma.quarterlyReview.findMany({
        where: { userId: user.id, year },
        orderBy: { quarter: "asc" },
      }),
      prisma.reminderPreference.findMany({ where: { userId: user.id } }),
      prisma.aiNudgeLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.lineAccount.findUnique({
        where: { userId: user.id },
        select: {
          lineUserId: true,
          reachable: true,
          reminderOptIn: true,
          broadcastOptIn: true,
          linkedAt: true,
        },
      }),
    ]);

  return NextResponse.json({
    ok: true,
    exportedAt: new Date().toISOString(),
    year,
    profile,
    reflection,
    goals: goals.map(toGoalDto),
    todos: todos.map(toTodoDto),
    moods: moods.map((row) => ({
      date: toDateOnly(row.date),
      level: row.level,
    })),
    monthPlans: monthPlans.map(toMonthPlanDto),
    monthlyReviews: monthly.map(toMonthlyDto),
    quarterlyReviews: quarterly.map(toQuarterlyDto),
    reminderPrefs: prefs.map(toPrefDto),
    lineAccount,
    nudges: nudges.map(toNudgeDto),
  });
}
