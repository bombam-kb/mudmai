import { PILLARS, type PillarId, goalProgressPercent } from "@/lib/pillars";
import {
  activeCalendarYear,
  fromDateOnly,
  isYmdInQuarter,
  quarterBounds,
  toDateOnly,
} from "@/lib/year";
import type { GoalStatus, Milestone, PillarType, QuarterlyGoal } from "@prisma/client";

export const GOAL_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
] as const;

export type GoalStatusId = (typeof GOAL_STATUSES)[number];

export type MilestoneInput = {
  id?: string;
  title: string;
  dueDate: string;
  isDone: boolean;
  order: number;
};

export type GoalInput = {
  year: number;
  quarter: number;
  pillar: PillarId;
  title: string;
  description: string;
  specificOutcome: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  status: GoalStatusId;
  milestones: MilestoneInput[];
};

export type MilestoneDto = {
  id: string;
  title: string;
  dueDate: string;
  isDone: boolean;
  order: number;
};

export type GoalDto = Omit<GoalInput, "milestones"> & {
  id: string;
  progress: number;
  milestones: MilestoneDto[];
};

const PILLAR_IDS = new Set<string>(PILLARS.map((pillar) => pillar.id));

export function emptyGoal(quarter: number, pillar: PillarId = "PERSONAL"): GoalInput {
  const year = activeCalendarYear();
  const { end } = quarterBounds(year, quarter);
  return {
    year,
    quarter,
    pillar,
    title: "",
    description: "",
    specificOutcome: "",
    targetValue: 0,
    currentValue: 0,
    unit: "",
    deadline: end,
    status: "NOT_STARTED",
    milestones: [],
  };
}

export function parseGoalPayload(input: unknown): {
  ok: true;
  data: GoalInput;
} | {
  ok: false;
  error: string;
} {
  const body = (input ?? {}) as Record<string, unknown>;
  const year = Number(body.year);
  const quarter = Number(body.quarter);
  const pillar = String(body.pillar ?? "");
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const specificOutcome =
    typeof body.specificOutcome === "string" ? body.specificOutcome.trim() : "";
  const targetValue = Number(body.targetValue);
  const currentValue = Number(body.currentValue ?? 0);
  const unit = typeof body.unit === "string" ? body.unit.trim() : "";
  const deadline = typeof body.deadline === "string" ? body.deadline.slice(0, 10) : "";
  const status = String(body.status ?? "NOT_STARTED") as GoalStatusId;

  if (!Number.isInteger(year) || year < 2000) return { ok: false, error: "year" };
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
    return { ok: false, error: "quarter" };
  }
  if (!PILLAR_IDS.has(pillar)) return { ok: false, error: "pillar" };
  if (!title) return { ok: false, error: "title" };
  if (!specificOutcome) return { ok: false, error: "specificOutcome" };
  if (!Number.isFinite(targetValue) || targetValue <= 0) {
    return { ok: false, error: "targetValue" };
  }
  if (!Number.isFinite(currentValue) || currentValue < 0) {
    return { ok: false, error: "currentValue" };
  }
  if (!unit) return { ok: false, error: "unit" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || !isYmdInQuarter(deadline, year, quarter)) {
    return { ok: false, error: "deadline" };
  }
  if (!GOAL_STATUSES.includes(status)) return { ok: false, error: "status" };

  const rawMilestones = Array.isArray(body.milestones) ? body.milestones : [];
  const milestones: MilestoneInput[] = [];
  for (const [index, item] of rawMilestones.entries()) {
    const row = item as Record<string, unknown>;
    const milestoneTitle = typeof row.title === "string" ? row.title.trim() : "";
    const dueDate = typeof row.dueDate === "string" ? row.dueDate.slice(0, 10) : "";
    if (!milestoneTitle) return { ok: false, error: "milestoneTitle" };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !isYmdInQuarter(dueDate, year, quarter)) {
      return { ok: false, error: "milestoneDueDate" };
    }
    milestones.push({
      id: typeof row.id === "string" ? row.id : undefined,
      title: milestoneTitle,
      dueDate,
      isDone: Boolean(row.isDone),
      order: Number.isInteger(row.order) ? Number(row.order) : index,
    });
  }

  let nextStatus = status;
  if (nextStatus === "NOT_STARTED" && currentValue > 0) {
    nextStatus = "IN_PROGRESS";
  }

  return {
    ok: true,
    data: {
      year,
      quarter,
      pillar: pillar as PillarId,
      title,
      description,
      specificOutcome,
      targetValue,
      currentValue,
      unit,
      deadline,
      status: nextStatus,
      milestones,
    },
  };
}

export function toGoalDto(
  goal: QuarterlyGoal & { milestones: Milestone[] },
): GoalDto {
  return {
    id: goal.id,
    year: goal.year,
    quarter: goal.quarter,
    pillar: goal.pillar as PillarId,
    title: goal.title,
    description: goal.description ?? "",
    specificOutcome: goal.specificOutcome,
    targetValue: goal.targetValue,
    currentValue: goal.currentValue,
    unit: goal.unit,
    deadline: toDateOnly(goal.deadline),
    status: goal.status,
    progress: goalProgressPercent(goal.currentValue, goal.targetValue),
    milestones: [...goal.milestones]
      .sort((a, b) => a.order - b.order)
      .map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        dueDate: toDateOnly(milestone.dueDate),
        isDone: milestone.isDone,
        order: milestone.order,
      })),
  };
}

export function goalWriteData(data: GoalInput) {
  return {
    year: data.year,
    quarter: data.quarter,
    pillar: data.pillar as PillarType,
    title: data.title,
    description: data.description || null,
    specificOutcome: data.specificOutcome,
    targetValue: data.targetValue,
    currentValue: data.currentValue,
    unit: data.unit,
    deadline: fromDateOnly(data.deadline),
    status: data.status as GoalStatus,
  };
}
