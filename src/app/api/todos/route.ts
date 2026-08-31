import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import {
  inheritPillar,
  parseTodoCreate,
  toTodoDto,
  todoStats,
  type GoalOption,
} from "@/lib/todos/schema";
import { fromDateOnly, isYmd, localYmd, shiftYmd, toDateOnly } from "@/lib/year";
import { rateLimitJson } from "@/lib/http/rate-limit";
import { forbidIfRenewal, forbidIfTodoQuota } from "@/lib/billing/guard";
import { PLAN, yearFromYmd } from "@/lib/billing/plan";
import type { PillarId } from "@/lib/pillars";

const includeGoal = {
  goal: { select: { id: true, title: true, pillar: true } },
} as const;

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const today = localYmd();

  let from = today;
  let to = today;
  if (date && isYmd(date)) {
    from = date;
    to = date;
  } else {
    if (fromParam && isYmd(fromParam)) from = fromParam;
    if (toParam && isYmd(toParam)) to = toParam;
  }
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }

  const todos = await prisma.dailyTodo
    .findMany({
      where: {
        userId: user.id,
        date: { gte: fromDateOnly(from), lte: fromDateOnly(to) },
      },
      include: includeGoal,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    })
    .catch(() => []);

  const weekFrom = shiftYmd(today, -6);
  const weekTodos = todos.filter((todo) => {
    const ymd = toDateOnly(todo.date);
    return ymd >= weekFrom && ymd <= today;
  });

  return NextResponse.json({
    ok: true,
    from,
    to,
    todos: todos.map(toTodoDto),
    stats: todoStats(todos),
    weekStats: todoStats(weekTodos),
    quota: date
      ? {
          todosUsed: todos.length,
          todosLimit: PLAN.free.todosPerDay,
        }
      : undefined,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`todos-write:${user.id}`, 120);
  if (limited) return limited;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const parsed = parseTodoCreate(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const year = yearFromYmd(parsed.data.date);
  const renew = forbidIfRenewal(auth.profile?.createdAt, year);
  if (renew) return renew;

  const used = await prisma.dailyTodo.count({
    where: { userId: user.id, date: fromDateOnly(parsed.data.date) },
  });
  const quota = forbidIfTodoQuota(used);
  if (quota) return quota;

  let pillar = parsed.data.pillar;
  if (parsed.data.goalId) {
    const goal = await prisma.quarterlyGoal.findFirst({
      where: { id: parsed.data.goalId, userId: user.id },
      select: { id: true, title: true, pillar: true, quarter: true },
    });
    if (!goal) {
      return NextResponse.json({ ok: false, error: "goal" }, { status: 400 });
    }
    const option: GoalOption = {
      id: goal.id,
      title: goal.title,
      pillar: goal.pillar as PillarId,
      quarter: goal.quarter,
    };
    pillar = inheritPillar(goal.id, parsed.data.pillar, [option]);
  }

  const todo = await prisma.dailyTodo.create({
    data: {
      userId: user.id,
      date: fromDateOnly(parsed.data.date),
      title: parsed.data.title,
      isCompleted: parsed.data.isCompleted,
      goalId: parsed.data.goalId,
      pillar,
    },
    include: includeGoal,
  });

  return NextResponse.json({ ok: true, todo: toTodoDto(todo) });
}
