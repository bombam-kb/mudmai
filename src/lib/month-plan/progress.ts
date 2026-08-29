import type { MonthGoalDto } from "@/lib/month-plan/schema";

export type MonthGoalProgress = {
  completed: number;
  total: number;
  percent: number;
};

/** Completion of this month's checklist goals. 0% when there are no goals yet. */
export function monthGoalProgress(
  goals: Pick<MonthGoalDto, "isDone">[],
): MonthGoalProgress {
  const total = goals.length;
  const completed = goals.filter((goal) => goal.isDone).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}
