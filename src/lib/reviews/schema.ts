import { EMPTY_RATINGS, type OnboardingRatings } from "@/lib/onboarding/schema";
import { PILLARS, type PillarId } from "@/lib/pillars";
import type { GoalStatusId } from "@/lib/goals/schema";

export type MonthlyReviewInput = {
  year: number;
  month: number;
  whatILovedMost: string;
  whatToStop: string;
  whatToContinue: string;
  ratings: OnboardingRatings;
};

export type MonthlyReviewDto = MonthlyReviewInput & {
  id: string;
};

export type GoalOutcome = {
  goalId: string;
  title: string;
  pillar: PillarId;
  progress: number;
  status: GoalStatusId;
  note: string;
};

export type QuarterlyReviewInput = {
  year: number;
  quarter: number;
  narrative: string;
  nextQuarterPlan: string;
  ratings: OnboardingRatings;
  goalOutcomes: GoalOutcome[];
};

export type QuarterlyReviewDto = QuarterlyReviewInput & {
  id: string;
};

export function ratingsToDb(ratings: OnboardingRatings) {
  return {
    ratingCareer: ratings.CAREER,
    ratingPersonal: ratings.PERSONAL,
    ratingFinance: ratings.FINANCE,
    ratingRelationships: ratings.RELATIONSHIPS,
    ratingMental: ratings.MENTAL_HEALTH,
    ratingPhysical: ratings.PHYSICAL_HEALTH,
  };
}

export function ratingsFromDb(row: {
  ratingCareer: number;
  ratingPersonal: number;
  ratingFinance: number;
  ratingRelationships: number;
  ratingMental: number;
  ratingPhysical: number;
}): OnboardingRatings {
  return {
    CAREER: row.ratingCareer,
    PERSONAL: row.ratingPersonal,
    FINANCE: row.ratingFinance,
    RELATIONSHIPS: row.ratingRelationships,
    MENTAL_HEALTH: row.ratingMental,
    PHYSICAL_HEALTH: row.ratingPhysical,
  };
}

export function emptyMonthly(year: number, month: number): MonthlyReviewInput {
  return {
    year,
    month,
    whatILovedMost: "",
    whatToStop: "",
    whatToContinue: "",
    ratings: { ...EMPTY_RATINGS },
  };
}

export function emptyQuarterly(year: number, quarter: number): QuarterlyReviewInput {
  return {
    year,
    quarter,
    narrative: "",
    nextQuarterPlan: "",
    ratings: { ...EMPTY_RATINGS },
    goalOutcomes: [],
  };
}

function readRatings(raw: unknown): OnboardingRatings | null {
  const body = (raw ?? {}) as Record<string, unknown>;
  const ratings = { ...EMPTY_RATINGS };
  for (const pillar of PILLARS) {
    const value = Number(body[pillar.id]);
    if (!Number.isInteger(value) || value < 1 || value > 5) return null;
    ratings[pillar.id] = value;
  }
  return ratings;
}

export function parseMonthlyPayload(input: unknown):
  | { ok: true; data: MonthlyReviewInput }
  | { ok: false; error: string } {
  const body = (input ?? {}) as Record<string, unknown>;
  const year = Number(body.year);
  const month = Number(body.month);
  const whatILovedMost =
    typeof body.whatILovedMost === "string" ? body.whatILovedMost.trim() : "";
  const whatToStop = typeof body.whatToStop === "string" ? body.whatToStop.trim() : "";
  const whatToContinue =
    typeof body.whatToContinue === "string" ? body.whatToContinue.trim() : "";
  const ratings = readRatings(body.ratings);
  if (!Number.isInteger(year) || year < 2000) return { ok: false, error: "year" };
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { ok: false, error: "month" };
  }
  if (!whatILovedMost || !whatToStop || !whatToContinue) {
    return { ok: false, error: "text" };
  }
  if (!ratings) return { ok: false, error: "ratings" };
  return {
    ok: true,
    data: { year, month, whatILovedMost, whatToStop, whatToContinue, ratings },
  };
}

export function parseQuarterlyPayload(input: unknown):
  | { ok: true; data: QuarterlyReviewInput }
  | { ok: false; error: string } {
  const body = (input ?? {}) as Record<string, unknown>;
  const year = Number(body.year);
  const quarter = Number(body.quarter);
  const narrative = typeof body.narrative === "string" ? body.narrative.trim() : "";
  const nextQuarterPlan =
    typeof body.nextQuarterPlan === "string" ? body.nextQuarterPlan.trim() : "";
  const ratings = readRatings(body.ratings);
  if (!Number.isInteger(year) || year < 2000) return { ok: false, error: "year" };
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
    return { ok: false, error: "quarter" };
  }
  if (!narrative || !nextQuarterPlan) return { ok: false, error: "text" };
  if (!ratings) return { ok: false, error: "ratings" };

  const rawOutcomes = Array.isArray(body.goalOutcomes) ? body.goalOutcomes : [];
  const goalOutcomes: GoalOutcome[] = rawOutcomes.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      goalId: typeof row.goalId === "string" ? row.goalId : "",
      title: typeof row.title === "string" ? row.title : "",
      pillar: (typeof row.pillar === "string" ? row.pillar : "PERSONAL") as PillarId,
      progress: Number(row.progress) || 0,
      status: (typeof row.status === "string" ? row.status : "NOT_STARTED") as GoalStatusId,
      note: typeof row.note === "string" ? row.note.trim() : "",
    };
  });

  return {
    ok: true,
    data: { year, quarter, narrative, nextQuarterPlan, ratings, goalOutcomes },
  };
}

export function toMonthlyDto(row: {
  id: string;
  year: number;
  month: number;
  whatILovedMost: string;
  whatToStop: string;
  whatToContinue: string;
  ratingCareer: number;
  ratingPersonal: number;
  ratingFinance: number;
  ratingRelationships: number;
  ratingMental: number;
  ratingPhysical: number;
}): MonthlyReviewDto {
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    whatILovedMost: row.whatILovedMost,
    whatToStop: row.whatToStop,
    whatToContinue: row.whatToContinue,
    ratings: ratingsFromDb(row),
  };
}

export function toQuarterlyDto(row: {
  id: string;
  year: number;
  quarter: number;
  narrative: string;
  nextQuarterPlan: string;
  goalOutcomes: unknown;
  ratingCareer: number;
  ratingPersonal: number;
  ratingFinance: number;
  ratingRelationships: number;
  ratingMental: number;
  ratingPhysical: number;
}): QuarterlyReviewDto {
  const outcomes = Array.isArray(row.goalOutcomes) ? row.goalOutcomes : [];
  return {
    id: row.id,
    year: row.year,
    quarter: row.quarter,
    narrative: row.narrative,
    nextQuarterPlan: row.nextQuarterPlan,
    ratings: ratingsFromDb(row),
    goalOutcomes: outcomes as GoalOutcome[],
  };
}
