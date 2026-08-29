import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { activeCalendarYear, fromDateOnly } from "@/lib/year";
import { goalWriteData, parseGoalPayload, toGoalDto } from "@/lib/goals/schema";
import { rateLimitJson } from "@/lib/http/rate-limit";
import { forbidIfRenewal } from "@/lib/billing/guard";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year") ?? activeCalendarYear());
  const quarter = url.searchParams.get("quarter");

  const goals = await prisma.quarterlyGoal
    .findMany({
      where: {
        userId: user.id,
        year,
        ...(quarter ? { quarter: Number(quarter) } : {}),
      },
      include: { milestones: { orderBy: { order: "asc" } } },
      orderBy: [{ quarter: "asc" }, { createdAt: "asc" }],
    })
    .catch(() => []);

  return NextResponse.json({
    ok: true,
    year,
    goals: goals.map(toGoalDto),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`goals-write:${user.id}`, 80);
  if (limited) return limited;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const parsed = parseGoalPayload(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const renew = forbidIfRenewal(auth.profile?.createdAt, parsed.data.year);
  if (renew) return renew;

  const goal = await prisma.quarterlyGoal.create({
    data: {
      userId: user.id,
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

  return NextResponse.json({ ok: true, goal: toGoalDto(goal) });
}
