import { setRequestLocale } from "next-intl/server";
import { GoalsBoard } from "@/components/goals/goals-board";
import { requireAppUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { toGoalDto } from "@/lib/goals/schema";
import { findMonthPlan } from "@/lib/month-plan/db";
import { toMonthPlanDto } from "@/lib/month-plan/schema";
import { activeCalendarYear, calendarParts } from "@/lib/year";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function GoalsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const year = activeCalendarYear();
  const parts = calendarParts();
  const session = await requireAppUser(locale);

  if (session.demoMode) {
    return (
      <GoalsBoard
        name={session.name}
        year={year}
        demoMode
        initialGoals={[]}
      />
    );
  }

  const [goals, monthPlan] = await Promise.all([
    prisma.quarterlyGoal
      .findMany({
        where: { userId: session.user.id, year },
        include: { milestones: { orderBy: { order: "asc" } } },
        orderBy: [{ quarter: "asc" }, { createdAt: "asc" }],
      })
      .catch(() => []),
    findMonthPlan(session.user.id, parts.year, parts.month),
  ]);

  return (
    <GoalsBoard
      name={session.name}
      year={year}
      demoMode={false}
      initialGoals={goals.map(toGoalDto)}
      month={parts.month}
      initialPlan={monthPlan ? toMonthPlanDto(monthPlan) : null}
    />
  );
}
