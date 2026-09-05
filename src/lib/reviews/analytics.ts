import type { OnboardingRatings } from "@/lib/onboarding/schema";
import { PILLARS, type PillarId } from "@/lib/pillars";
import type { MonthlyReviewDto } from "@/lib/reviews/schema";

export type MonthHealth = "critical" | "low" | "neutral" | "good" | "great";

export type MonthScore = {
  month: number;
  score: number;
  health: MonthHealth;
  ratings: OnboardingRatings;
  delta: number | null;
};

export type PillarAverage = {
  id: PillarId;
  average: number;
  health: MonthHealth;
};

export type PillarRatingStatus = {
  id: PillarId;
  score: number;
  health: MonthHealth;
};

export type YearPushPlan = {
  targetScore: number;
  currentAverage: number;
  currentHealth: MonthHealth;
  gap: number;
  reviewsRemaining: number;
  requiredPerReview: number | null;
  needsPush: boolean;
  weakestPillars: PillarAverage[];
};

export type YearReviewStats = {
  ytdAverage: number;
  ytdHealth: MonthHealth;
  completedMonths: number;
  latestDelta: number | null;
  monthScores: MonthScore[];
  pillarAverages: PillarAverage[];
  bestMonth: MonthScore | null;
  toughestMonth: MonthScore | null;
};

export function averageRating(ratings: OnboardingRatings): number {
  const total = PILLARS.reduce((sum, pillar) => sum + ratings[pillar.id], 0);
  return total / PILLARS.length;
}

export function monthHealth(score: number): MonthHealth {
  if (score < 2.25) return "critical";
  if (score < 3) return "low";
  if (score < 3.75) return "neutral";
  if (score < 4.25) return "good";
  return "great";
}

export function healthStyle(health: MonthHealth) {
  switch (health) {
    case "critical":
      return {
        bg: "rgb(254 202 202)",
        border: "rgb(239 68 68)",
        text: "rgb(127 29 29)",
        glow: "rgb(239 68 68 / 0.35)",
      };
    case "low":
      return {
        bg: "rgb(254 215 170)",
        border: "rgb(249 115 22)",
        text: "rgb(154 52 18)",
        glow: "rgb(249 115 22 / 0.3)",
      };
    case "neutral":
      return {
        bg: "rgb(254 240 138)",
        border: "rgb(234 179 8)",
        text: "rgb(133 77 14)",
        glow: "rgb(234 179 8 / 0.28)",
      };
    case "good":
      return {
        bg: "rgb(187 247 208)",
        border: "rgb(34 197 94)",
        text: "rgb(21 128 61)",
        glow: "rgb(34 197 94 / 0.32)",
      };
    case "great":
      return {
        bg: "rgb(167 243 208)",
        border: "rgb(16 185 129)",
        text: "rgb(6 95 70)",
        glow: "rgb(16 185 129 / 0.45)",
      };
  }
}

export function computeYearStats(monthlies: MonthlyReviewDto[]): YearReviewStats | null {
  if (monthlies.length === 0) return null;

  const sorted = [...monthlies].sort((a, b) => a.month - b.month);
  const monthScores: MonthScore[] = sorted.map((review, index) => {
    const score = averageRating(review.ratings);
    const prev = index > 0 ? averageRating(sorted[index - 1]!.ratings) : null;
    return {
      month: review.month,
      score,
      health: monthHealth(score),
      ratings: review.ratings,
      delta: prev === null ? null : score - prev,
    };
  });

  const ytdAverage =
    monthScores.reduce((sum, item) => sum + item.score, 0) / monthScores.length;

  const pillarTotals = Object.fromEntries(PILLARS.map((pillar) => [pillar.id, 0])) as Record<
    PillarId,
    number
  >;
  for (const review of sorted) {
    for (const pillar of PILLARS) {
      pillarTotals[pillar.id] += review.ratings[pillar.id];
    }
  }
  const pillarAverages = PILLARS.map((pillar) => {
    const average = pillarTotals[pillar.id] / sorted.length;
    return {
      id: pillar.id,
      average,
      health: monthHealth(average),
    };
  });

  const bestMonth = monthScores.reduce((best, item) =>
    item.score > best.score ? item : best,
  );
  const toughestMonth = monthScores.reduce((worst, item) =>
    item.score < worst.score ? item : worst,
  );

  return {
    ytdAverage,
    ytdHealth: monthHealth(ytdAverage),
    completedMonths: monthScores.length,
    latestDelta: monthScores[monthScores.length - 1]?.delta ?? null,
    monthScores,
    pillarAverages,
    bestMonth,
    toughestMonth,
  };
}

export function monthScoreMap(stats: YearReviewStats | null) {
  return new Map(stats?.monthScores.map((item) => [item.month, item]) ?? []);
}

export function formatScore(score: number) {
  return score.toFixed(1);
}

export function pillarStatuses(ratings: OnboardingRatings): PillarRatingStatus[] {
  return PILLARS.map((pillar) => {
    const score = ratings[pillar.id];
    return { id: pillar.id, score, health: monthHealth(score) };
  });
}

export const YEAR_FINISH_TARGET = 4;

export function computeYearPushPlan(
  stats: YearReviewStats,
  targetScore = YEAR_FINISH_TARGET,
): YearPushPlan {
  const reviewsRemaining = Math.max(0, 12 - stats.completedMonths);
  const totalSoFar = stats.monthScores.reduce((sum, item) => sum + item.score, 0);
  const totalTarget = targetScore * 12;
  const gap = targetScore - stats.ytdAverage;
  const needed = totalTarget - totalSoFar;
  const requiredPerReview =
    reviewsRemaining > 0 && needed > 0 ? needed / reviewsRemaining : null;

  const weakestPillars = [...stats.pillarAverages]
    .sort((a, b) => a.average - b.average)
    .slice(0, 3);

  return {
    targetScore,
    currentAverage: stats.ytdAverage,
    currentHealth: stats.ytdHealth,
    gap,
    reviewsRemaining,
    requiredPerReview,
    needsPush: gap > 0.05 && reviewsRemaining > 0,
    weakestPillars,
  };
}
