"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TodoList } from "@/components/todos/todo-list";
import { TodayMood } from "@/components/mood/today-mood";
import type { GoalOption, TodoDto } from "@/lib/todos/schema";
import type { MoodLevel } from "@/lib/mood/schema";
import { activeCalendarYear, localYmd } from "@/lib/year";
import { useGoalsStore } from "@/stores/goals-store";
import { useTodosStore } from "@/stores/todos-store";

type Props = {
  demoMode?: boolean;
  initialTodos?: TodoDto[];
  goals?: GoalOption[];
  initialMood?: MoodLevel | null;
};

export function TodayTodos({
  demoMode,
  initialTodos = [],
  goals = [],
  initialMood = null,
}: Props) {
  const t = useTranslations("todos");
  const th = useTranslations("home");
  const storedTodos = useTodosStore((state) => state.todos);
  const storedGoals = useGoalsStore((state) => state.goals);
  const [liveTodos, setLiveTodos] = useState(initialTodos);
  const today = localYmd();

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
  const openToday = source.filter(
    (todo) => todo.date === today && !todo.isCompleted,
  ).length;

  return (
    <div>
      <section className="rounded-[2rem] bg-gradient-to-br from-violet-600 via-brand to-cyan-500 p-[3px] shadow-card">
        <div className="jr-today-panel rounded-[1.85rem] p-5 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-personal">
            {th("todayEyebrow")}
          </p>
          <div className="jr-today-head mb-2 mt-1 flex items-center justify-between gap-3">
            <h2 className="font-display text-3xl text-ink">{th("today")}</h2>
            <TodayMood
              date={today}
              demoMode={demoMode}
              initialLevel={initialMood}
            />
          </div>
          <p className="mb-4 text-sm text-muted">
            {openToday > 0 ? th("todayKeepGoing") : th("todayInvite")}
          </p>
          <TodoList
            date={today}
            demoMode={Boolean(demoMode)}
            goals={goalOptions}
            initialTodos={source}
            compact
            featured
            emptyText={th("todayEmpty")}
            placeholder={th("todayPlaceholder")}
            onTodosChange={demoMode ? undefined : setLiveTodos}
          />
        </div>
      </section>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/todos"
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-slate-200"
        >
          {t("openAll")}
        </Link>
        <Link
          href="/calendar"
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          {t("openCalendar")}
        </Link>
      </div>
    </div>
  );
}
