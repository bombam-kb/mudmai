"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Link, useRouter } from "@/i18n/navigation";
import { signOutClient } from "@/lib/auth/sign-out-client";
import { todoStats, type TodoDto } from "@/lib/todos/schema";
import { localYmd, monthCells } from "@/lib/year";
import { useTodosStore } from "@/stores/todos-store";
import { MonthPlanCard } from "@/components/month-plan/month-plan-card";
import type { MonthPlanDto } from "@/lib/month-plan/schema";

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type Props = {
  name: string;
  demoMode: boolean;
  year: number;
  month: number;
  initialTodos: TodoDto[];
  initialPlan?: MonthPlanDto | null;
};

export function MonthCalendar({
  name,
  demoMode,
  year,
  month,
  initialTodos,
  initialPlan = null,
}: Props) {
  const t = useTranslations("calendar");
  const tt = useTranslations("todos");
  const router = useRouter();
  const stored = useTodosStore((state) => state.todos);
  const today = localYmd();
  const cells = monthCells(year, month);
  const source = demoMode ? stored : initialTodos;
  const inView = useMemo(() => {
    const start = cells[0].ymd;
    const end = cells[cells.length - 1].ymd;
    return source.filter((todo) => todo.date >= start && todo.date <= end);
  }, [cells, source]);

  const byDate = useMemo(() => {
    const map = new Map<string, TodoDto[]>();
    for (const todo of inView) {
      const list = map.get(todo.date) ?? [];
      list.push(todo);
      map.set(todo.date, list);
    }
    return map;
  }, [inView]);

  const monthTodos = inView.filter((todo) => todo.date.slice(0, 7) === `${year}-${String(month).padStart(2, "0")}`);
  const monthRate = todoStats(monthTodos).rate;

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <AppShell name={name} onSignOut={signOut}>
      <div className="jr-page-head mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-personal">
            {t("eyebrow")}
          </p>
          <h1 className="font-display text-4xl">
            {t("title", { month: t(`months.${month}`), year })}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("monthRate", { rate: monthRate })}</p>
        </div>
        <div className="jr-chip-rail">
          <Link
            href={`/calendar?year=${prev.year}&month=${prev.month}`}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted ring-1 ring-slate-200"
          >
            {t("prev")}
          </Link>
          <Link
            href={`/calendar?year=${Number(today.slice(0, 4))}&month=${Number(today.slice(5, 7))}`}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            {t("jumpToday")}
          </Link>
          <Link
            href={`/calendar?year=${next.year}&month=${next.month}`}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted ring-1 ring-slate-200"
          >
            {t("next")}
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <MonthPlanCard
          year={year}
          month={month}
          demoMode={demoMode}
          initialPlan={initialPlan}
        />
      </div>

      {demoMode ? (
        <p className="mb-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {tt("demo")}
        </p>
      ) : null}

      <div className="jr-month-cal overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-100">
        <div className="jr-cal-head grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-muted">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-3">
              {t(`weekdays.${day}`)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell) => {
            const dayTodos = byDate.get(cell.ymd) ?? [];
            const stats = todoStats(dayTodos);
            const isToday = cell.ymd === today;
            return (
              <Link
                key={cell.ymd}
                href={`/todos?date=${cell.ymd}`}
                className={`jr-cal-cell min-h-[6.5rem] border-b border-r border-slate-100 p-2 text-left transition hover:bg-violet-50 ${
                  cell.inMonth ? "bg-white" : "bg-slate-50/70"
                } ${isToday ? "ring-2 ring-inset ring-brand" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-sm font-semibold ${
                      isToday
                        ? "bg-brand text-white"
                        : cell.inMonth
                          ? "text-ink"
                          : "text-slate-400"
                    }`}
                  >
                    {cell.day}
                  </span>
                  {stats.total > 0 ? (
                    <span className="jr-cal-count text-[11px] font-semibold text-muted">
                      {t("count", { completed: stats.completed, total: stats.total })}
                    </span>
                  ) : null}
                </div>
                {stats.total > 0 ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${stats.rate}%` }}
                    />
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
