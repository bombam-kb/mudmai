import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import {
  copyTodoToDate,
  mergeYmdList,
  parseTodoPostpone,
  toTodoDto,
} from "@/lib/todos/schema";
import { fromDateOnly } from "@/lib/year";
import { rateLimitJson } from "@/lib/http/rate-limit";
import { forbidIfRenewal, forbidIfTodoQuota } from "@/lib/billing/guard";
import { yearFromYmd } from "@/lib/billing/plan";

type Params = { params: Promise<{ id: string }> };

const includeGoal = {
  goal: { select: { id: true, title: true, pillar: true } },
} as const;

export async function POST(request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`todos-write:${user.id}`, 120);
  if (limited) return limited;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const { id } = await params;
  const existing = await prisma.dailyTodo.findFirst({
    where: { id, userId: user.id },
    include: includeGoal,
  });
  if (!existing) return NextResponse.json({ ok: false }, { status: 404 });

  const original = toTodoDto(existing);
  const parsed = parseTodoPostpone(await request.json().catch(() => null), original.date);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const dates = parsed.data.dates;
  for (const date of dates) {
    const year = yearFromYmd(date);
    const renew = forbidIfRenewal(auth.profile?.createdAt, year);
    if (renew) return renew;
    const used = await prisma.dailyTodo.count({
      where: { userId: user.id, date: fromDateOnly(date) },
    });
    const quota = forbidIfTodoQuota(used);
    if (quota) return quota;
  }
  const postponedToDates = mergeYmdList(original.postponedToDates, dates);
  const reason = parsed.data.reason ?? original.incompleteReason;

  const copies = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const date of dates) {
      const exists = await tx.dailyTodo.findFirst({
        where: {
          userId: user.id,
          sourceTodoId: original.id,
          date: fromDateOnly(date),
        },
        select: { id: true },
      });
      if (exists) continue;
      const input = copyTodoToDate({ ...original, incompleteReason: reason }, date);
      const row = await tx.dailyTodo.create({
        data: {
          userId: user.id,
          date: fromDateOnly(input.date),
          title: input.title,
          isCompleted: false,
          incompleteReason: null,
          postponedToDates: [],
          sourceTodoId: original.id,
          carriedFromDate: fromDateOnly(original.date),
          goalId: input.goalId,
          pillar: input.pillar,
        },
        include: includeGoal,
      });
      created.push(row);
    }
    await tx.dailyTodo.update({
      where: { id: original.id },
      data: {
        isCompleted: false,
        incompleteReason: reason,
        postponedToDates,
      },
    });
    return created;
  });

  const updated = await prisma.dailyTodo.findFirst({
    where: { id: original.id, userId: user.id },
    include: includeGoal,
  });

  return NextResponse.json({
    ok: true,
    todo: updated ? toTodoDto(updated) : { ...original, incompleteReason: reason, postponedToDates },
    copies: copies.map(toTodoDto),
  });
}
