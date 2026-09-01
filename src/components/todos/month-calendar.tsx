"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Link, useRouter } from "@/i18n/navigation";
import { signOutClient } from "@/lib/auth/sign-out-client";
import { todoStats, type TodoDto } from "@/lib/todos/schema";
import { localYmd, monthDayList, weekdayKey } from "@/lib/year";
import { useTodosStore } from "@/stores/todos-store";
import { PillarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

type Props = {
  name: string;
  demoMode: boolean;
  year: number;
  month: number;
  initialTodos: TodoDto[];
};

export function MonthCalendar({
  name,
  demoMode,
  year,
  month,
  initialTodos,
}: Props) {
  const t = useTranslations("calendar");
  const tt = useTranslations("todos");
  const router = useRouter();
  const stored = useTodosStore((state) => state.todos);
  const today = localYmd();
  const days = monthDayList(year, month);
  const source = demoMode ? stored : initialTodos;
  const inView = useMemo(() => {
    const start = days[0]?.ymd;
    const end = days[days.length - 1]?.ymd;
    if (!start || !end) return [];
    return source.filter((todo) => todo.date >= start && todo.date <= end);
  }, [days, source]);

  const byDate = useMemo(() => {
    const map = new Map<string, TodoDto[]>();
    for (const todo of inView) {
      const list = map.get(todo.date) ?? [];
      list.push(todo);
      map.set(todo.date, list);
    }
    return map;
  }, [inView]);

  const monthTodos = inView.filter(
    (todo) => todo.date.slice(0, 7) === `${year}-${String(month).padStart(2, "0")}`,
  );
  const monthRate = todoStats(monthTodos).rate;
  const inThisMonth = today.startsWith(`${year}-${String(month).padStart(2, "0")}`);
  const [openYmd, setOpenYmd] = useState<string | null>(inThisMonth ? today : null);

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const isCurrentMonth = year === todayYear && month === todayMonth;
  const pagerLabel = isCurrentMonth
    ? t("thisMonth")
    : t("title", { month: t(`months.${month}`), year });

  return (
    <AppShell name={name} onSignOut={signOut}>
      <div className="jr-page-head jr-cal-toolbar mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-personal">
            {t("eyebrow")}
          </p>
          <p className="mt-1 text-sm text-muted">{t("monthRate", { rate: monthRate })}</p>
        </div>
        {isCurrentMonth ? (
          <span className="jr-cal-today is-now">{t("jumpToday")}</span>
        ) : (
          <Link
            href={`/calendar?year=${todayYear}&month=${todayMonth}`}
            className="jr-cal-today"
          >
            {t("jumpToday")}
          </Link>
        )}
      </div>

      <div className="jr-month-pager mb-6">
        <Link
          href={`/calendar?year=${prev.year}&month=${prev.month}`}
          className="jr-month-pager-btn"
          aria-label={t("prev")}
        >
          <ChevronLeftIcon size={16} />
          <span>{t("prev")}</span>
        </Link>
        <h1 className="jr-month-pager-now">{pagerLabel}</h1>
        <Link
          href={`/calendar?year=${next.year}&month=${next.month}`}
          className="jr-month-pager-btn"
          aria-label={t("next")}
        >
          <span>{t("next")}</span>
          <ChevronRightIcon size={16} />
        </Link>
      </div>

      {demoMode ? (
        <p className="mb-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {tt("demo")}
        </p>
      ) : null}

      <section className="jr-day-list">
        {days.map((cell) => {
          const dayTodos = byDate.get(cell.ymd) ?? [];
          const stats = todoStats(dayTodos);
          const isToday = cell.ymd === today;
          const open = openYmd === cell.ymd;
          return (
            <div
              key={cell.ymd}
              className={`jr-day-block ${isToday ? "jr-day-today" : ""} ${open ? "jr-day-open" : ""}`}
            >
              <button
                type="button"
                className="jr-day-row"
                aria-expanded={open}
                onClick={() => setOpenYmd(open ? null : cell.ymd)}
              >
                <span className="jr-day-num">{cell.day}</span>
                <span className="jr-day-name">
                  {t(`weekdays.${weekdayKey(cell.ymd)}`)}
                  {isToday ? <span className="jr-day-badge">{t("jumpToday")}</span> : null}
                </span>
                <span className="jr-day-rate">
                  {stats.total > 0 ? t("dayRate", { rate: stats.rate }) : t("dayEmpty")}
                </span>
                <span className="jr-fold-chevron" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 6.5 8 10.5 12 6.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
              {open ? (
                <div className="jr-day-body">
                  {dayTodos.length === 0 ? (
                    <p className="jr-day-empty">{t("noTasks")}</p>
                  ) : (
                    <ul className="jr-day-items">
                      {dayTodos.map((todo) => (
                        <li
                          key={todo.id}
                          className={`jr-day-item ${todo.isCompleted ? "is-done" : ""}`}
                        >
                          <span className={`jr-day-check ${todo.isCompleted ? "is-on" : ""}`} aria-hidden />
                          {todo.pillar ? <PillarIcon id={todo.pillar} size={14} /> : null}
                          <span className="min-w-0 flex-1">{todo.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link href={`/todos?date=${cell.ymd}`} className="jr-day-open-link">
                    {t("openDay")}
                  </Link>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>
    </AppShell>
  );
}
