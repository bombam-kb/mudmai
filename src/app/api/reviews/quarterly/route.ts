import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { toGoalDto } from "@/lib/goals/schema";
import {
  parseQuarterlyPayload,
  ratingsToDb,
  toQuarterlyDto,
} from "@/lib/reviews/schema";
import { activeCalendarYear } from "@/lib/year";
import { rateLimitJson } from "@/lib/http/rate-limit";
import { forbidIfRenewal } from "@/lib/billing/guard";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year") ?? activeCalendarYear());
  const quarter = url.searchParams.get("quarter");

  const [reviews, goals] = await Promise.all([
    prisma.quarterlyReview
      .findMany({
        where: {
          userId: user.id,
          year,
          ...(quarter ? { quarter: Number(quarter) } : {}),
        },
        orderBy: { quarter: "asc" },
      })
      .catch(() => []),
    prisma.quarterlyGoal
      .findMany({
        where: {
          userId: user.id,
          year,
          ...(quarter ? { quarter: Number(quarter) } : {}),
        },
        include: { milestones: { orderBy: { order: "asc" } } },
        orderBy: { createdAt: "asc" },
      })
      .catch(() => []),
  ]);

  return NextResponse.json({
    ok: true,
    year,
    reviews: reviews.map(toQuarterlyDto),
    goals: goals.map(toGoalDto),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`reviews:${user.id}`, 40);
  if (limited) return limited;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const parsed = parseQuarterlyPayload(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const renew = forbidIfRenewal(auth.profile?.createdAt, parsed.data.year);
  if (renew) return renew;

  const goalOutcomes = parsed.data.goalOutcomes as Prisma.InputJsonValue;
  const fields = {
    year: parsed.data.year,
    quarter: parsed.data.quarter,
    narrative: parsed.data.narrative,
    nextQuarterPlan: parsed.data.nextQuarterPlan,
    goalOutcomes,
    ...ratingsToDb(parsed.data.ratings),
  };

  const review = await prisma.quarterlyReview.upsert({
    where: {
      userId_year_quarter: {
        userId: user.id,
        year: parsed.data.year,
        quarter: parsed.data.quarter,
      },
    },
    create: { userId: user.id, ...fields },
    update: fields,
  });

  return NextResponse.json({ ok: true, review: toQuarterlyDto(review) });
}
