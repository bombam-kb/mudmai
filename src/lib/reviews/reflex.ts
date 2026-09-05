import { monthGoalProgress } from "@/lib/month-plan/progress";
import { emptyMonthPlan, toMonthPlanDto, type MonthGoalDto, type MonthPlanDto } from "@/lib/month-plan/schema";
import { toGoalDto, type GoalDto } from "@/lib/goals/schema";
import { todoStats, toTodoDto, type TodoDto } from "@/lib/todos/schema";
import {
  averageRating,
  monthHealth,
  pillarStatuses,
  type MonthHealth,
  type PillarRatingStatus,
} from "@/lib/reviews/analytics";
import { toMonthlyDto, type MonthlyReviewDto } from "@/lib/reviews/schema";
import { monthBounds } from "@/lib/year";
import { findMonthPlan } from "@/lib/month-plan/db";
import { prisma } from "@/lib/prisma";

export type MonthlyReflexData = {
  year: number;
  month: number;
  review: MonthlyReviewDto;
  monthPlan: MonthPlanDto | null;
  planProgress: ReturnType<typeof monthGoalProgress>;
  highlightGoals: MonthGoalDto[];
  todoStats: ReturnType<typeof todoStats>;
  todoHighlights: string[];
  quarterGoals: GoalDto[];
  memoryImageUrl: string | null;
  memoryCaption: string;
  analytics: {
    score: number;
    health: MonthHealth;
    delta: number | null;
    pillarStatuses: PillarRatingStatus[];
  };
};

function pickHighlightGoals(plan: MonthPlanDto | null): MonthGoalDto[] {
  if (!plan) return [];
  const done = plan.goals.filter((goal) => goal.isDone).slice(0, 4);
  const pending = plan.goals.filter((goal) => !goal.isDone).slice(0, 3);
  return [...done, ...pending];
}

function pickTodoHighlights(todos: TodoDto[]): string[] {
  return todos
    .filter((todo) => todo.isCompleted && todo.title.trim())
    .slice(0, 6)
    .map((todo) => todo.title.trim());
}

export async function loadMonthlyReflex(
  userId: string,
  year: number,
  month: number,
): Promise<MonthlyReflexData | null> {
  const reviewRow = await prisma.monthlyReview
    .findUnique({
      where: { userId_year_month: { userId, year, month } },
    })
    .catch(() => null);
  if (!reviewRow) return null;

  const review = toMonthlyDto(reviewRow);
  const { start, end } = monthBounds(year, month);
  const quarter = Math.ceil(month / 3);

  const [planRow, todos, goals, priorReview] = await Promise.all([
    findMonthPlan(userId, year, month),
    prisma.dailyTodo
      .findMany({
        where: {
          userId,
          date: { gte: new Date(`${start}T00:00:00.000Z`), lte: new Date(`${end}T00:00:00.000Z`) },
        },
        include: { goal: { select: { id: true, title: true, pillar: true } } },
        orderBy: { date: "asc" },
      })
      .catch(() => []),
    prisma.quarterlyGoal
      .findMany({
        where: { userId, year, quarter },
        include: { milestones: { orderBy: { order: "asc" } } },
      })
      .catch(() => []),
    prisma.monthlyReview
      .findFirst({
        where: { userId, year, month: { lt: month } },
        orderBy: { month: "desc" },
      })
      .catch(() => null),
  ]);

  const monthPlan = planRow ? toMonthPlanDto(planRow) : null;
  const todoDtos = todos.map(toTodoDto);
  const score = averageRating(review.ratings);
  const priorScore = priorReview ? averageRating(toMonthlyDto(priorReview).ratings) : null;

  return {
    year,
    month,
    review,
    monthPlan,
    planProgress: monthGoalProgress(monthPlan?.goals ?? []),
    highlightGoals: pickHighlightGoals(monthPlan),
    todoStats: todoStats(todoDtos),
    todoHighlights: pickTodoHighlights(todoDtos),
    quarterGoals: goals.map(toGoalDto),
    memoryImageUrl: monthPlan?.memoryImageUrl ?? null,
    memoryCaption: monthPlan?.memoryCaption?.trim() ?? "",
    analytics: {
      score,
      health: monthHealth(score),
      delta: priorScore === null ? null : score - priorScore,
      pillarStatuses: pillarStatuses(review.ratings),
    },
  };
}

export function buildDemoReflex(
  review: MonthlyReviewDto,
  monthPlan: MonthPlanDto | null,
  todos: TodoDto[] = [],
): MonthlyReflexData {
  const score = averageRating(review.ratings);
  return {
    year: review.year,
    month: review.month,
    review,
    monthPlan,
    planProgress: monthGoalProgress(monthPlan?.goals ?? []),
    highlightGoals: pickHighlightGoals(monthPlan),
    todoStats: todoStats(todos),
    todoHighlights: pickTodoHighlights(todos),
    quarterGoals: [],
    memoryImageUrl: monthPlan?.memoryImageUrl ?? null,
    memoryCaption: monthPlan?.memoryCaption?.trim() ?? "",
    analytics: {
      score,
      health: monthHealth(score),
      delta: null,
      pillarStatuses: pillarStatuses(review.ratings),
    },
  };
}

export function emptyReflexPlan(year: number, month: number) {
  return emptyMonthPlan(year, month);
}
