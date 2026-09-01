import { setRequestLocale } from "next-intl/server";
import { MonthCalendar } from "@/components/todos/month-calendar";
import { requireAppUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { toTodoDto } from "@/lib/todos/schema";
import { fromDateOnly, localYmd, monthDayList } from "@/lib/year";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
};

export const dynamic = "force-dynamic";

export default async function CalendarPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const today = localYmd();
  const nowYear = Number(today.slice(0, 4));
  const nowMonth = Number(today.slice(5, 7));
  const year = Number(query.year) || nowYear;
  const month = Math.min(12, Math.max(1, Number(query.month) || nowMonth));
  const days = monthDayList(year, month);
  const from = days[0].ymd;
  const to = days[days.length - 1].ymd;
  const session = await requireAppUser(locale);

  if (session.demoMode) {
    return (
      <MonthCalendar
        name={session.name}
        demoMode
        year={year}
        month={month}
        initialTodos={[]}
      />
    );
  }

  const todos = await prisma.dailyTodo
    .findMany({
      where: {
        userId: session.user.id,
        date: { gte: fromDateOnly(from), lte: fromDateOnly(to) },
      },
      include: { goal: { select: { id: true, title: true, pillar: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    })
    .catch(() => []);

  return (
    <MonthCalendar
      name={session.name}
      demoMode={false}
      year={year}
      month={month}
      initialTodos={todos.map(toTodoDto)}
    />
  );
}
