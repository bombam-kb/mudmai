"use client";

import { memo, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useRouter, Link } from "@/i18n/navigation";
import { signOutClient } from "@/lib/auth/sign-out-client";
import { todoStats, type TodoDto } from "@/lib/todos/schema";
import { localYmd, monthDayList, weekdayKey } from "@/lib/year";
import { useTodosStore } from "@/stores/todos-store";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

const CalendarDayTodos = dynamic(
  () =>
    import("@/components/todos/calendar-day-todos").then((mod) => mod.CalendarDayTodos),
  {
    loading: () => <p className="jr-day-loading" aria-hidden />,
  },
);

type DayBlockProps = {
  ymd: string;
  day: number;
  isToday: boolean;
  open: boolean;
  stats: ReturnType<typeof todoStats>;
  dayTodos: TodoDto[];
  demoMode: boolean;
  weekdayLabel: string;
  todayLabel: string;
  dayRateLabel: string;
  dayEmptyLabel: string;
  noTasksLabel: string;
  openDayLabel: string;
  onToggle: (ymd: string) => void;
  onTodosChange: (updater: (current: TodoDto[]) => TodoDto[]) => void;
};

const CalendarDayBlock = memo(function CalendarDayBlock({
  ymd,
  day,
  isToday,
  open,
  stats,
  dayTodos,
  demoMode,
  weekdayLabel,
  todayLabel,
  dayRateLabel,
  dayEmptyLabel,
  noTasksLabel,
  openDayLabel,
  onToggle,
  onTodosChange,
}: DayBlockProps) {
  return (
    <div className={`jr-day-block ${isToday ? "jr-day-today" : ""} ${open ? "jr-day-open" : ""}`}>
      <button
        type="button"
        className="jr-day-row"
        aria-expanded={open}
        onClick={() => onToggle(ymd)}
      >
        <span className="jr-day-num">{day}</span>
        <span className="jr-day-name">
          {weekdayLabel}
          {isToday ? <span className="jr-day-badge">{todayLabel}</span> : null}
        </span>
        <span className="jr-day-rate">
          {stats.total > 0 ? dayRateLabel : dayEmptyLabel}
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
            <p className="jr-day-empty">{noTasksLabel}</p>
          ) : (
            <CalendarDayTodos todos={dayTodos} demoMode={demoMode} onTodosChange={onTodosChange} />
          )}
          <Link href={`/todos?date=${ymd}`} className="jr-day-open-link" prefetch={false}>
            {openDayLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
});

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
  year: initialYear,
  month: initialMonth,
  initialTodos,
}: Props) {
  const t = useTranslations("calendar");
  const tt = useTranslations("todos");
  const locale = useLocale();
  const router = useRouter();
  const stored = useTodosStore((state) => state.todos);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [liveTodos, setLiveTodos] = useState(initialTodos);
  const [openYmd, setOpenYmd] = useState<string | null>(() => {
    const today = localYmd();
    const inMonth = today.startsWith(`${initialYear}-${String(initialMonth).padStart(2, "0")}`);
    return inMonth ? today : null;
  });
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [isOpening, startOpenTransition] = useTransition();

  const today = localYmd();
  const days = useMemo(() => monthDayList(year, month), [year, month]);

  useEffect(() => {
    setYear(initialYear);
    setMonth(initialMonth);
    setLiveTodos(initialTodos);
  }, [initialYear, initialMonth, initialTodos]);

  const source = demoMode ? stored : liveTodos;

  const inView = useMemo(() => {
    const start = days[0]?.ymd;
    const end = days[days.length - 1]?.ymd;
    if (!start || !end) return [];
    return source.filter((todo) => todo.date >= start && todo.date <= end);
  }, [days, source]);

  const dayMeta = useMemo(() => {
    const byDate = new Map<string, TodoDto[]>();
    for (const todo of inView) {
      const list = byDate.get(todo.date) ?? [];
      list.push(todo);
      byDate.set(todo.date, list);
    }

    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const monthTodos = inView.filter((todo) => todo.date.startsWith(monthPrefix));
    const monthRate = todoStats(monthTodos).rate;

    const cells = days.map((cell) => {
      const todos = byDate.get(cell.ymd) ?? [];
      const stats = todoStats(todos);
      return {
        cell,
        todos,
        stats,
        weekdayLabel: t(`weekdays.${weekdayKey(cell.ymd)}`),
        dayRateLabel: todos.length > 0 ? t("dayRate", { rate: stats.rate }) : t("dayEmpty"),
      };
    });

    return { monthRate, cells };
  }, [days, inView, t, year, month]);

  const handleTodosChange = useCallback(
    (updater: (current: TodoDto[]) => TodoDto[]) => {
      setLiveTodos(updater);
    },
    [],
  );

  const toggleDay = useCallback((ymd: string) => {
    startOpenTransition(() => {
      setOpenYmd((current) => (current === ymd ? null : ymd));
    });
  }, []);

  const loadMonth = useCallback(
    async (nextYear: number, nextMonth: number) => {
      if (nextYear === year && nextMonth === month) return;

      const nextDays = monthDayList(nextYear, nextMonth);
      const from = nextDays[0]?.ymd;
      const to = nextDays[nextDays.length - 1]?.ymd;
      if (!from || !to) return;

      setYear(nextYear);
      setMonth(nextMonth);
      setOpenYmd(null);

      if (typeof window !== "undefined") {
        const prefix = locale === "en" ? "/en" : "/th";
        window.history.replaceState(null, "", `${prefix}/calendar?year=${nextYear}&month=${nextMonth}`);
      }

      if (demoMode) return;

      setLoadingMonth(true);
      try {
        const response = await fetch(`/api/todos?from=${from}&to=${to}`, { cache: "no-store" });
        const json = (await response.json()) as { ok?: boolean; todos?: TodoDto[] };
        if (json.ok && json.todos) setLiveTodos(json.todos);
      } finally {
        setLoadingMonth(false);
      }
    },
    [demoMode, locale, month, year],
  );

  useEffect(() => {
    if (demoMode) return;
    const prev =
      month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    const next =
      month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
    for (const target of [prev, next]) {
      const range = monthDayList(target.year, target.month);
      const from = range[0]?.ymd;
      const to = range[range.length - 1]?.ymd;
      if (!from || !to) continue;
      void fetch(`/api/todos?from=${from}&to=${to}`);
    }
  }, [demoMode, month, year]);

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
          <p className="mt-1 text-sm text-muted">
            {t("monthRate", { rate: dayMeta.monthRate })}
          </p>
        </div>
        {isCurrentMonth ? (
          <span className="jr-cal-today is-now">{t("jumpToday")}</span>
        ) : (
          <button
            type="button"
            className="jr-cal-today"
            disabled={loadingMonth}
            onClick={() => void loadMonth(todayYear, todayMonth)}
          >
            {t("jumpToday")}
          </button>
        )}
      </div>

      <div className="jr-month-pager mb-6">
        <button
          type="button"
          className="jr-month-pager-btn"
          aria-label={t("prev")}
          disabled={loadingMonth}
          onClick={() => void loadMonth(prev.year, prev.month)}
        >
          <ChevronLeftIcon size={16} />
          <span>{t("prev")}</span>
        </button>
        <h1 className="jr-month-pager-now">{pagerLabel}</h1>
        <button
          type="button"
          className="jr-month-pager-btn"
          aria-label={t("next")}
          disabled={loadingMonth}
          onClick={() => void loadMonth(next.year, next.month)}
        >
          <span>{t("next")}</span>
          <ChevronRightIcon size={16} />
        </button>
      </div>

      {demoMode ? (
        <p className="mb-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {tt("demo")}
        </p>
      ) : null}

      <section
        className={`jr-day-list ${loadingMonth || isOpening ? "is-busy" : ""}`}
        aria-busy={loadingMonth || isOpening}
      >
        {dayMeta.cells.map(({ cell, todos, stats, weekdayLabel, dayRateLabel }) => (
          <CalendarDayBlock
            key={cell.ymd}
            ymd={cell.ymd}
            day={cell.day}
            isToday={cell.ymd === today}
            open={openYmd === cell.ymd}
            stats={stats}
            dayTodos={todos}
            demoMode={demoMode}
            weekdayLabel={weekdayLabel}
            todayLabel={t("jumpToday")}
            dayRateLabel={dayRateLabel}
            dayEmptyLabel={t("dayEmpty")}
            noTasksLabel={t("noTasks")}
            openDayLabel={t("openDay")}
            onToggle={toggleDay}
            onTodosChange={handleTodosChange}
          />
        ))}
      </section>
    </AppShell>
  );
}
