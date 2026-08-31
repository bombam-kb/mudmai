import { setRequestLocale } from "next-intl/server";
import { TodosBoard } from "@/components/todos/todos-board";
import { requireAppUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { toTodoDto, type GoalOption } from "@/lib/todos/schema";
import { activeCalendarYear, fromDateOnly, isYmd, localYmd, shiftYmd } from "@/lib/year";
import type { PillarId } from "@/lib/pillars";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string }>;
};

export const dynamic = "force-dynamic";

export default async function TodosPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { date } = await searchParams;
  setRequestLocale(locale);

  const today = localYmd();
  const selectedDate = date && isYmd(date) ? date : today;
  const from = [shiftYmd(today, -1), selectedDate].sort()[0];
  const to = [shiftYmd(today, 90), selectedDate].sort()[1];
  const session = await requireAppUser(locale);

  if (session.demoMode) {
    return (
      <TodosBoard
        name={session.name}
        demoMode
        selectedDate={selectedDate}
        loadedFrom={from}
        loadedTo={to}
        initialTodos={[]}
        goals={[]}
      />
    );
  }

  const [todos, goals] = await Promise.all([
    prisma.dailyTodo
      .findMany({
        where: {
          userId: session.user.id,
          date: { gte: fromDateOnly(from), lte: fromDateOnly(to) },
        },
        include: { goal: { select: { id: true, title: true, pillar: true } } },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      })
      .catch(() => []),
    prisma.quarterlyGoal
      .findMany({
        where: { userId: session.user.id, year: activeCalendarYear() },
        select: { id: true, title: true, pillar: true, quarter: true },
        orderBy: [{ quarter: "asc" }, { createdAt: "asc" }],
      })
      .catch(() => []),
  ]);

  return (
    <TodosBoard
      name={session.name}
      demoMode={false}
      selectedDate={selectedDate}
      loadedFrom={from}
      loadedTo={to}
      initialTodos={todos.map(toTodoDto)}
      goals={goals.map(
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
