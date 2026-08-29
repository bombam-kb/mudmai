"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { TodoList } from "@/components/todos/todo-list";
import { Link, useRouter } from "@/i18n/navigation";
import { signOutClient } from "@/lib/auth/sign-out-client";
import type { GoalOption, TodoDto } from "@/lib/todos/schema";
import { todoStats } from "@/lib/todos/schema";
import { activeCalendarYear, localYmd, shiftYmd } from "@/lib/year";
import { useGoalsStore } from "@/stores/goals-store";
import { useTodosStore } from "@/stores/todos-store";

type Tab = "today" | "yesterday" | "upcoming";

type Props = {
  name: string;
  demoMode: boolean;
  selectedDate: string;
  initialTodos: TodoDto[];
  goals: GoalOption[];
};

export function TodosBoard({
  name,
  demoMode,
  selectedDate,
  initialTodos,
  goals,
}: Props) {
  const t = useTranslations("todos");
  const router = useRouter();
  const storedTodos = useTodosStore((state) => state.todos);
  const storedGoals = useGoalsStore((state) => state.goals);
  const [liveTodos, setLiveTodos] = useState(initialTodos);
  const today = localYmd();
  const yesterday = shiftYmd(today, -1);

  useEffect(() => {
    setLiveTodos(initialTodos);
  }, [initialTodos]);

  const goalOptions = demoMode
    ? storedGoals
        .filter((goal) => goal.year === activeCalendarYear())
        .map((goal) => ({
          id: goal.id,
          title: goal.title,
          pillar: goal.pillar,
          quarter: goal.quarter,
        }))
    : goals;

  const source = demoMode ? storedTodos : liveTodos;

  const tab: Tab | "other" =
    selectedDate === today
      ? "today"
      : selectedDate === yesterday
        ? "yesterday"
        : selectedDate > today
          ? "upcoming"
          : "other";

  const upcoming = useMemo(
    () =>
      source
        .filter((todo) => todo.date > today)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [source, today],
  );
  const upcomingDates = [...new Set(upcoming.map((todo) => todo.date))];
  const week = source.filter(
    (todo) => todo.date >= shiftYmd(today, -6) && todo.date <= today,
  );
  const weekRate = todoStats(week).rate;

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  function go(date: string) {
    router.push(`/todos?date=${date}`);
  }

  return (
    <AppShell name={name} onSignOut={signOut}>
      <div className="jr-page-head mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-personal">
            {t("eyebrow")}
          </p>
          <h1 className="font-display text-4xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("weekStats", { rate: weekRate })}</p>
        </div>
        <Link
          href="/calendar"
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
        >
          {t("openCalendar")}
        </Link>
      </div>

      {demoMode ? (
        <p className="mb-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("demo")}
        </p>
      ) : null}

      <div className="jr-chip-rail mb-4">
        {(
          [
            ["today", today],
            ["yesterday", yesterday],
            ["upcoming", shiftYmd(today, 1)],
          ] as const
        ).map(([key, date]) => (
          <button
            key={key}
            type="button"
            onClick={() => go(date)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              tab === key ? "bg-brand text-white" : "bg-white text-muted ring-1 ring-slate-200"
            }`}
          >
            {t(key)}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
          {t("pickDate")}
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              if (event.target.value) go(event.target.value);
            }}
            className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200"
          />
        </label>
      </div>

      {tab === "upcoming" ? (
        <div className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
            <h2 className="mb-3 font-display text-2xl">{t("addUpcoming")}</h2>
            <TodoList
              date={selectedDate >= today ? selectedDate : shiftYmd(today, 1)}
              demoMode={demoMode}
              goals={goalOptions}
              initialTodos={source}
              onTodosChange={demoMode ? undefined : setLiveTodos}
            />
          </section>
          {upcomingDates.length === 0 ? (
            <p className="text-muted">{t("emptyUpcoming")}</p>
          ) : (
            upcomingDates
              .filter((date) => date !== selectedDate)
              .map((date) => (
                <section
                  key={date}
                  className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100"
                >
                  <h2 className="mb-3 font-display text-2xl">{date}</h2>
                  <TodoList
                    date={date}
                    demoMode={demoMode}
                    goals={goalOptions}
                    initialTodos={source}
                    onTodosChange={demoMode ? undefined : setLiveTodos}
                  />
                </section>
              ))
          )}
        </div>
      ) : (
        <section className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
          <h2 className="mb-3 font-display text-2xl">
            {tab === "yesterday"
              ? t("yesterday")
              : tab === "today"
                ? t("today")
                : selectedDate}
            {tab !== "other" ? (
              <span className="ml-2 text-base font-normal text-muted">{selectedDate}</span>
            ) : null}
          </h2>
          <TodoList
            date={selectedDate}
            demoMode={demoMode}
            goals={goalOptions}
            initialTodos={source}
            onTodosChange={demoMode ? undefined : setLiveTodos}
          />
        </section>
      )}
    </AppShell>
  );
}
