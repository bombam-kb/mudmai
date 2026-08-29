import { PILLARS, type PillarId } from "@/lib/pillars";
import { fromDateOnly, isYmd, toDateOnly } from "@/lib/year";
import type { DailyTodo, PillarType, QuarterlyGoal } from "@prisma/client";

const PILLAR_IDS = new Set<string>(PILLARS.map((pillar) => pillar.id));
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REASON_MAX = 400;
const POSTPONE_MAX_DATES = 14;

export function isUuid(value: string) {
  return UUID.test(value);
}

export type GoalOption = {
  id: string;
  title: string;
  pillar: PillarId;
  quarter: number;
};

export type TodoInput = {
  date: string;
  title: string;
  isCompleted: boolean;
  goalId: string | null;
  pillar: PillarId | null;
  incompleteReason: string | null;
  postponedToDates: string[];
  sourceTodoId: string | null;
  carriedFromDate: string | null;
};

export type TodoDto = TodoInput & {
  id: string;
  goalTitle: string | null;
};

export type TodoPostponeInput = {
  reason: string | null;
  dates: string[];
};

export type TodoStats = {
  total: number;
  completed: number;
  rate: number;
};

type TodoRow = DailyTodo & {
  goal?: Pick<QuarterlyGoal, "id" | "title" | "pillar"> | null;
};

export function todoStats(todos: { isCompleted: boolean }[]): TodoStats {
  const total = todos.length;
  const completed = todos.filter((todo) => todo.isCompleted).length;
  return {
    total,
    completed,
    rate: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function readYmdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter((item): item is string => typeof item === "string" && isYmd(item)),
    ),
  ].sort();
}

export function mergeYmdList(current: string[], added: string[]) {
  return readYmdList([...current, ...added]);
}

export function toTodoDto(row: TodoRow): TodoDto {
  const pillar = (row.pillar ?? row.goal?.pillar ?? null) as PillarId | null;
  return {
    id: row.id,
    date: toDateOnly(row.date),
    title: row.title,
    isCompleted: row.isCompleted,
    goalId: row.goalId,
    pillar,
    goalTitle: row.goal?.title ?? null,
    incompleteReason: row.incompleteReason?.trim() || null,
    postponedToDates: readYmdList(row.postponedToDates),
    sourceTodoId: row.sourceTodoId,
    carriedFromDate: row.carriedFromDate ? toDateOnly(row.carriedFromDate) : null,
  };
}

export function emptyTodo(date: string): TodoInput {
  return {
    date,
    title: "",
    isCompleted: false,
    goalId: null,
    pillar: null,
    incompleteReason: null,
    postponedToDates: [],
    sourceTodoId: null,
    carriedFromDate: null,
  };
}

function readGoalId(value: unknown): { ok: true; goalId: string | null } | { ok: false } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, goalId: null };
  }
  if (typeof value === "string" && isUuid(value)) {
    return { ok: true, goalId: value };
  }
  return { ok: false };
}

function readPillar(value: unknown): PillarId | null {
  if (typeof value === "string" && PILLAR_IDS.has(value)) {
    return value as PillarId;
  }
  return null;
}

function readReason(value: unknown): { ok: true; reason: string | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, reason: null };
  if (typeof value !== "string") return { ok: false };
  const trimmed = value.trim();
  if (trimmed.length > REASON_MAX) return { ok: false };
  return { ok: true, reason: trimmed || null };
}

export function parseTodoCreate(input: unknown):
  | { ok: true; data: TodoInput }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "payload" };
  const body = input as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 200) return { ok: false, error: "title" };
  const date = typeof body.date === "string" ? body.date : "";
  if (!isYmd(date)) return { ok: false, error: "date" };
  const goal = readGoalId(body.goalId);
  if (!goal.ok) return { ok: false, error: "goalId" };
  return {
    ok: true,
    data: {
      date,
      title,
      isCompleted: Boolean(body.isCompleted),
      goalId: goal.goalId,
      pillar: readPillar(body.pillar),
      incompleteReason: null,
      postponedToDates: [],
      sourceTodoId: null,
      carriedFromDate: null,
    },
  };
}

export function parseTodoPatch(input: unknown):
  | { ok: true; data: Partial<TodoInput> }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "payload" };
  const body = input as Record<string, unknown>;
  const data: Partial<TodoInput> = {};

  if ("title" in body) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 200) return { ok: false, error: "title" };
    data.title = title;
  }
  if ("date" in body) {
    if (typeof body.date !== "string" || !isYmd(body.date)) {
      return { ok: false, error: "date" };
    }
    data.date = body.date;
  }
  if ("isCompleted" in body) {
    data.isCompleted = Boolean(body.isCompleted);
  }
  if ("goalId" in body) {
    const goal = readGoalId(body.goalId);
    if (!goal.ok) return { ok: false, error: "goalId" };
    data.goalId = goal.goalId;
  }
  if ("pillar" in body) {
    data.pillar = readPillar(body.pillar);
  }
  if ("incompleteReason" in body) {
    const reason = readReason(body.incompleteReason);
    if (!reason.ok) return { ok: false, error: "incompleteReason" };
    data.incompleteReason = reason.reason;
  }
  if (data.isCompleted) {
    data.incompleteReason = null;
  }

  if (Object.keys(data).length === 0) return { ok: false, error: "empty" };
  return { ok: true, data };
}

export function parseTodoPostpone(
  input: unknown,
  currentDate: string,
): { ok: true; data: TodoPostponeInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "payload" };
  const body = input as Record<string, unknown>;
  const reason = readReason(body.reason ?? body.incompleteReason);
  if (!reason.ok) return { ok: false, error: "reason" };
  const rawDates = Array.isArray(body.dates)
    ? body.dates
    : typeof body.date === "string"
      ? [body.date]
      : [];
  const dates = readYmdList(rawDates).filter((date) => date !== currentDate);
  if (dates.length === 0) return { ok: false, error: "dates" };
  if (dates.length > POSTPONE_MAX_DATES) return { ok: false, error: "dates" };
  return { ok: true, data: { reason: reason.reason, dates } };
}

export function todoWriteData(input: Partial<TodoInput>) {
  const data: {
    date?: Date;
    title?: string;
    isCompleted?: boolean;
    goalId?: string | null;
    pillar?: PillarType | null;
    incompleteReason?: string | null;
    postponedToDates?: string[];
    sourceTodoId?: string | null;
    carriedFromDate?: Date | null;
  } = {};
  if (input.date) data.date = fromDateOnly(input.date);
  if (input.title !== undefined) data.title = input.title;
  if (input.isCompleted !== undefined) data.isCompleted = input.isCompleted;
  if ("goalId" in input) data.goalId = input.goalId ?? null;
  if ("pillar" in input) data.pillar = input.pillar ?? null;
  if ("incompleteReason" in input) data.incompleteReason = input.incompleteReason ?? null;
  if ("postponedToDates" in input) data.postponedToDates = input.postponedToDates ?? [];
  if ("sourceTodoId" in input) data.sourceTodoId = input.sourceTodoId ?? null;
  if ("carriedFromDate" in input) {
    data.carriedFromDate = input.carriedFromDate
      ? fromDateOnly(input.carriedFromDate)
      : null;
  }
  return data;
}

export function inheritPillar(
  goalId: string | null,
  pillar: PillarId | null,
  goals: GoalOption[],
): PillarId | null {
  if (pillar) return pillar;
  if (!goalId) return null;
  return goals.find((goal) => goal.id === goalId)?.pillar ?? null;
}

export function goalTitleFor(
  goalId: string | null,
  goals: GoalOption[],
): string | null {
  if (!goalId) return null;
  return goals.find((goal) => goal.id === goalId)?.title ?? null;
}

export function normalizeTodo(
  todo: Partial<TodoDto> & Pick<TodoDto, "id" | "date" | "title">,
): TodoDto {
  return {
    id: todo.id,
    date: todo.date,
    title: todo.title,
    isCompleted: Boolean(todo.isCompleted),
    goalId: todo.goalId ?? null,
    pillar: todo.pillar ?? null,
    goalTitle: todo.goalTitle ?? null,
    incompleteReason: todo.incompleteReason ?? null,
    postponedToDates: readYmdList(todo.postponedToDates),
    sourceTodoId: todo.sourceTodoId ?? null,
    carriedFromDate: todo.carriedFromDate ?? null,
  };
}

export function copyTodoToDate(todo: TodoDto, date: string): TodoInput {
  return {
    date,
    title: todo.title,
    isCompleted: false,
    goalId: todo.goalId,
    pillar: todo.pillar,
    incompleteReason: null,
    postponedToDates: [],
    sourceTodoId: todo.id,
    carriedFromDate: todo.date,
  };
}
