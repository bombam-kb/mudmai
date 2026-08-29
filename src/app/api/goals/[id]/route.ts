import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { fromDateOnly } from "@/lib/year";
import { goalWriteData, parseGoalPayload, toGoalDto, GOAL_STATUSES, type GoalStatusId } from "@/lib/goals/schema";
import { rateLimitJson } from "@/lib/http/rate-limit";
import { forbidIfRenewal } from "@/lib/billing/guard";

type Params = { params: Promise<{ id: string }> };

async function ownedGoal(userId: string, id: string) {
  return prisma.quarterlyGoal.findFirst({
    where: { id, userId },
    include: { milestones: { orderBy: { order: "asc" } } },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const goal = await ownedGoal(user.id, id);
  if (!goal) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, goal: toGoalDto(goal) });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`goals-write:${user.id}`, 80);
  if (limited) return limited;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const { id } = await params;
  const existing = await ownedGoal(user.id, id);
  if (!existing) return NextResponse.json({ ok: false }, { status: 404 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "payload" }, { status: 400 });

  if (body.milestones || body.title || body.specificOutcome || body.deadline) {
    const parsed = parseGoalPayload({
      ...toGoalDto(existing),
      ...body,
    });
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }
    const renew = forbidIfRenewal(auth.profile?.createdAt, parsed.data.year);
    if (renew) return renew;

    const goal = await prisma.$transaction(async (tx) => {
      await tx.milestone.deleteMany({ where: { goalId: id } });
      return tx.quarterlyGoal.update({
        where: { id },
        data: {
          ...goalWriteData(parsed.data),
          milestones: {
            create: parsed.data.milestones.map((milestone, index) => ({
              title: milestone.title,
              dueDate: fromDateOnly(milestone.dueDate),
              isDone: milestone.isDone,
              order: milestone.order ?? index,
            })),
          },
        },
        include: { milestones: { orderBy: { order: "asc" } } },
      });
    });

    return NextResponse.json({ ok: true, goal: toGoalDto(goal) });
  }

  const data: {
    currentValue?: number;
    status?: typeof existing.status;
  } = {};
  if (typeof body.currentValue === "number") data.currentValue = body.currentValue;
  if (typeof body.status === "string") {
    if (!GOAL_STATUSES.includes(body.status as GoalStatusId)) {
      return NextResponse.json({ ok: false, error: "status" }, { status: 400 });
    }
    data.status = body.status as GoalStatusId;
  }
  if (data.currentValue !== undefined && data.currentValue > 0 && existing.status === "NOT_STARTED") {
    data.status = "IN_PROGRESS";
  }

  const renew = forbidIfRenewal(auth.profile?.createdAt, existing.year);
  if (renew) return renew;

  const goal = await prisma.quarterlyGoal.update({
    where: { id },
    data,
    include: { milestones: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json({ ok: true, goal: toGoalDto(goal) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`goals-write:${user.id}`, 80);
  if (limited) return limited;

  const { id } = await params;
  const existing = await ownedGoal(user.id, id);
  if (!existing) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.quarterlyGoal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
