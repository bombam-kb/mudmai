import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import {
  inheritPillar,
  parseTodoPatch,
  toTodoDto,
  todoWriteData,
  type GoalOption,
} from "@/lib/todos/schema";
import type { PillarId } from "@/lib/pillars";
import { fromDateOnly, toDateOnly } from "@/lib/year";
import { rateLimitJson } from "@/lib/http/rate-limit";
import { forbidIfRenewal, forbidIfTodoQuota } from "@/lib/billing/guard";
import { yearFromYmd } from "@/lib/billing/plan";

type Params = { params: Promise<{ id: string }> };

const includeGoal = {
  goal: { select: { id: true, title: true, pillar: true } },
} as const;

async function ownedTodo(userId: string, id: string) {
  return prisma.dailyTodo.findFirst({
    where: { id, userId },
    include: includeGoal,
  });
}

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const todo = await ownedTodo(user.id, id);
  if (!todo) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, todo: toTodoDto(todo) });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`todos-write:${user.id}`, 120);
  if (limited) return limited;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const { id } = await params;
  const existing = await ownedTodo(user.id, id);
  if (!existing) return NextResponse.json({ ok: false }, { status: 404 });

  const parsed = parseTodoPatch(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const nextDate = parsed.data.date ?? toDateOnly(existing.date);
  const renew = forbidIfRenewal(auth.profile?.createdAt, yearFromYmd(nextDate));
  if (renew) return renew;
  if (parsed.data.date && parsed.data.date !== toDateOnly(existing.date)) {
    const used = await prisma.dailyTodo.count({
      where: { userId: user.id, date: fromDateOnly(parsed.data.date) },
    });
    const quota = forbidIfTodoQuota(used);
    if (quota) return quota;
  }

  const nextGoalId =
    "goalId" in parsed.data ? parsed.data.goalId ?? null : existing.goalId;
  let pillar =
    "pillar" in parsed.data
      ? parsed.data.pillar ?? null
      : ((existing.pillar ?? existing.goal?.pillar ?? null) as PillarId | null);

  if ("goalId" in parsed.data && nextGoalId) {
    const goal = await prisma.quarterlyGoal.findFirst({
      where: { id: nextGoalId, userId: user.id },
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
    pillar = inheritPillar(goal.id, pillar, [option]);
  } else if ("goalId" in parsed.data) {
    pillar = parsed.data.pillar ?? null;
  }

  const todo = await prisma.dailyTodo.update({
    where: { id },
    data: todoWriteData({ ...parsed.data, pillar, goalId: nextGoalId }),
    include: includeGoal,
  });

  return NextResponse.json({ ok: true, todo: toTodoDto(todo) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`todos-write:${user.id}`, 120);
  if (limited) return limited;

  const { id } = await params;
  const existing = await ownedTodo(user.id, id);
  if (!existing) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.dailyTodo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
