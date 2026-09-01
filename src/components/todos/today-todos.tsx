"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TodoList } from "@/components/todos/todo-list";
import { TodayMood } from "@/components/mood/today-mood";
import { ListIcon } from "@/components/icons";
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
    <div className="min-w-0">
      <section className="jr-today-frame min-w-0 overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-600 via-brand to-cyan-500 p-[3px] shadow-card">
        <div className="jr-today-panel min-w-0 rounded-[1.85rem] p-5 sm:p-6">
          <p className="jr-today-eyebrow text-sm font-semibold uppercase tracking-wide text-personal">
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
          <p className="jr-today-invite mb-4 text-sm text-muted">
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
          <div className="jr-today-links mt-4 flex flex-wrap gap-2">
            <Link
              href="/todos"
              title={t("openAll")}
              aria-label={t("openAll")}
              className="jr-icon-link inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-semibold text-ink ring-1 ring-slate-200"
            >
              <ListIcon size={16} />
              <span className="jr-btn-label">{t("openAll")}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
