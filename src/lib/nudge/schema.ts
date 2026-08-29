import type { NudgeTrigger } from "@prisma/client";
import type { OnboardingRatings } from "@/lib/onboarding/schema";
import { todoStats, type TodoStats } from "@/lib/todos/schema";

export const NUDGE_TRIGGERS = [
  "LOW_MENTAL_SCORE",
  "LOW_CAREER_SCORE",
  "TASK_SLUMP",
] as const;

export type NudgeTriggerId = (typeof NUDGE_TRIGGERS)[number];

export type NudgeDto = {
  id: string;
  triggerReason: NudgeTriggerId;
  nudgeText: string;
  contextUsed: string;
  isRead: boolean;
  createdAt: string;
};

export type NudgeReflection = {
  healingThings: string;
  happiestMoment: string;
  expectationsNextYear: string;
};

export type PendingNudge = {
  triggerReason: NudgeTriggerId;
  contextUsed: string;
  generateContext: string;
};

const SLUMP_MIN_TODOS = 3;
const SLUMP_RATE = 30;

export function isLowMental(ratings: OnboardingRatings) {
  return ratings.MENTAL_HEALTH > 0 && ratings.MENTAL_HEALTH <= 2;
}

export function isLowCareer(ratings: OnboardingRatings) {
  return ratings.CAREER > 0 && ratings.CAREER <= 2;
}

export function isTaskSlump(stats: TodoStats) {
  return stats.total >= SLUMP_MIN_TODOS && stats.rate < SLUMP_RATE;
}

export function periodForLowScore(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function periodForSlump(fromYmd: string, toYmd: string) {
  return `${fromYmd}/${toYmd}`;
}

export function parseContext(raw: string): {
  period?: string;
  rating?: number;
  rate?: number;
  total?: number;
  completed?: number;
} {
  try {
    return JSON.parse(raw) as {
      period?: string;
      rating?: number;
      rate?: number;
      total?: number;
      completed?: number;
    };
  } catch {
    return {};
  }
}

export function publicNudgeContext(raw: string) {
  const parsed = parseContext(raw);
  return JSON.stringify({
    ...(parsed.period ? { period: parsed.period } : {}),
    ...(typeof parsed.rating === "number" ? { rating: parsed.rating } : {}),
    ...(typeof parsed.rate === "number" ? { rate: parsed.rate } : {}),
    ...(typeof parsed.total === "number" ? { total: parsed.total } : {}),
    ...(typeof parsed.completed === "number" ? { completed: parsed.completed } : {}),
  });
}

export function alreadyLogged(
  logs: Array<{ triggerReason: string; contextUsed: string }>,
  trigger: NudgeTriggerId,
  period: string,
) {
  return logs.some(
    (log) =>
      log.triggerReason === trigger && parseContext(log.contextUsed).period === period,
  );
}

export function detectPendingNudges(input: {
  reflection: NudgeReflection | null;
  monthly: { year: number; month: number; ratings: OnboardingRatings } | null;
  weekTodos: { isCompleted: boolean }[];
  weekFrom: string;
  weekTo: string;
  existing: Array<{ triggerReason: string; contextUsed: string }>;
}): PendingNudge[] {
  const pending: PendingNudge[] = [];
  const reflection = input.reflection;

  if (input.monthly && reflection) {
    const period = periodForLowScore(input.monthly.year, input.monthly.month);
    if (
      isLowMental(input.monthly.ratings) &&
      !alreadyLogged(input.existing, "LOW_MENTAL_SCORE", period)
    ) {
      pending.push({
        triggerReason: "LOW_MENTAL_SCORE",
        contextUsed: JSON.stringify({
          period,
          rating: input.monthly.ratings.MENTAL_HEALTH,
        }),
        generateContext: JSON.stringify({
          period,
          rating: input.monthly.ratings.MENTAL_HEALTH,
          healingThings: reflection.healingThings,
          happiestMoment: reflection.happiestMoment,
        }),
      });
    }
    if (
      isLowCareer(input.monthly.ratings) &&
      !alreadyLogged(input.existing, "LOW_CAREER_SCORE", period)
    ) {
      pending.push({
        triggerReason: "LOW_CAREER_SCORE",
        contextUsed: JSON.stringify({
          period,
          rating: input.monthly.ratings.CAREER,
        }),
        generateContext: JSON.stringify({
          period,
          rating: input.monthly.ratings.CAREER,
          healingThings: reflection.healingThings,
          happiestMoment: reflection.happiestMoment,
        }),
      });
    }
  }

  const stats = todoStats(input.weekTodos);
  const slumpPeriod = periodForSlump(input.weekFrom, input.weekTo);
  if (
    reflection &&
    isTaskSlump(stats) &&
    !alreadyLogged(input.existing, "TASK_SLUMP", slumpPeriod)
  ) {
    pending.push({
      triggerReason: "TASK_SLUMP",
      contextUsed: JSON.stringify({
        period: slumpPeriod,
        rate: stats.rate,
        total: stats.total,
        completed: stats.completed,
      }),
      generateContext: JSON.stringify({
        period: slumpPeriod,
        rate: stats.rate,
        total: stats.total,
        completed: stats.completed,
        expectationsNextYear: reflection.expectationsNextYear,
      }),
    });
  }

  return pending;
}

export function toNudgeDto(row: {
  id: string;
  triggerReason: NudgeTrigger;
  nudgeText: string;
  contextUsed: string;
  isRead: boolean;
  createdAt: Date;
}): NudgeDto {
  return {
    id: row.id,
    triggerReason: row.triggerReason,
    nudgeText: row.nudgeText,
    contextUsed: publicNudgeContext(row.contextUsed),
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };
}

export function hrefForNudge(trigger: NudgeTriggerId) {
  if (trigger === "TASK_SLUMP") return "/todos";
  return "/reviews";
}
