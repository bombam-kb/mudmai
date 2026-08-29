import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { toGoalDto } from "@/lib/goals/schema";
import { rateLimitJson } from "@/lib/http/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`goals-write:${user.id}`, 80);
  if (limited) return limited;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    isDone?: boolean;
    currentValue?: number;
  } | null;

  const milestone = await prisma.milestone.findFirst({
    where: { id, goal: { userId: user.id } },
    include: { goal: { include: { milestones: { orderBy: { order: "asc" } } } } },
  });
  if (!milestone) return NextResponse.json({ ok: false }, { status: 404 });

  const updated = await prisma.milestone.update({
    where: { id },
    data: { isDone: Boolean(body?.isDone) },
    include: { goal: { include: { milestones: { orderBy: { order: "asc" } } } } },
  });

  return NextResponse.json({ ok: true, goal: toGoalDto(updated.goal) });
}
