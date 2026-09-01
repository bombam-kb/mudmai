import { PILLAR_MAP, type PillarId } from "@/lib/pillars";

export const MONTH_GOAL_MAX = 40;
export const MONTH_GOAL_TITLE_MAX = 120;
export const MONTH_IMPORTANT_MAX = 2000;

const LOOSE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function goalId(value: unknown) {
  if (typeof value === "string" && LOOSE_ID.test(value)) return value;
  return crypto.randomUUID();
}

function readPillar(value: unknown): PillarId | null {
  if (typeof value !== "string") return null;
  return value in PILLAR_MAP ? (value as PillarId) : null;
}

export type MonthGoalDto = {
  id: string;
  title: string;
  isDone: boolean;
  pillar: PillarId | null;
};

export type MonthPlanDto = {
  year: number;
  month: number;
  importantNote: string;
  goals: MonthGoalDto[];
};

export function emptyMonthPlan(year: number, month: number): MonthPlanDto {
  return { year, month, importantNote: "", goals: [] };
}

export function isMonthPlanFilled(plan: MonthPlanDto | null | undefined) {
  if (!plan) return false;
  return plan.importantNote.trim().length > 0 || plan.goals.length > 0;
}

export function isYearMonth(year: unknown, month: unknown) {
  return (
    typeof year === "number" &&
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= 2100 &&
    typeof month === "number" &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  );
}

function coerceJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function readGoals(raw: unknown): MonthGoalDto[] | null {
  const value = coerceJson(raw);
  if (!Array.isArray(value)) return null;
  if (value.length > MONTH_GOAL_MAX) return null;
  const goals: MonthGoalDto[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title || title.length > MONTH_GOAL_TITLE_MAX) return null;
    const id = goalId(row.id);
    goals.push({
      id,
      title,
      isDone: Boolean(row.isDone),
      pillar: readPillar(row.pillar),
    });
  }
  return goals;
}

export function toMonthPlanDto(row: {
  year: number;
  month: number;
  importantNote: string;
  goals: unknown;
}): MonthPlanDto {
  return {
    year: row.year,
    month: row.month,
    importantNote: row.importantNote,
    goals: readGoals(row.goals) ?? [],
  };
}

export function parseMonthPlanPut(input: unknown):
  | { ok: true; data: MonthPlanDto }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "payload" };
  const body = input as Record<string, unknown>;
  const year = Number(body.year);
  const month = Number(body.month);
  if (!isYearMonth(year, month)) return { ok: false, error: "period" };
  const importantNote =
    typeof body.importantNote === "string" ? body.importantNote.trim() : "";
  if (importantNote.length > MONTH_IMPORTANT_MAX) return { ok: false, error: "important" };
  const goals = readGoals(body.goals);
  if (!goals) return { ok: false, error: "goals" };
  return { ok: true, data: { year, month, importantNote, goals } };
}
