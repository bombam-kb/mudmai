import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { evaluateNudgesForUser, monthlyToNudgeInput } from "@/lib/nudge/evaluate";
import { toNudgeDto } from "@/lib/nudge/schema";
import { activeCalendarYear, fromDateOnly, localYmd, shiftYmd } from "@/lib/year";
import { consumeRateLimit, rateLimitResponse } from "@/lib/http/rate-limit";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const logs = await prisma.aiNudgeLog
    .findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    .catch(() => []);

  return NextResponse.json({
    ok: true,
    nudges: logs.map(toNudgeDto),
    unread: logs.filter((log) => !log.isRead).length,
  });
}

export async function POST() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const limited = await consumeRateLimit(`nudges:${user.id}`, 8, 60 * 60 * 1000);
  if (!limited.ok) {
    const { status, headers } = rateLimitResponse(limited.retryAfterMs);
    return NextResponse.json({ ok: false, reason: "rate" }, { status, headers });
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { preferredLocale: true },
  });
  const locale = profile?.preferredLocale === "en" ? "en" : "th";
  const year = activeCalendarYear();
  const today = localYmd();
  const weekFrom = shiftYmd(today, -6);

  const [reflection, monthly, todos] = await Promise.all([
    prisma.pastYearReflection.findUnique({
      where: { userId_year: { userId: user.id, year } },
    }),
    prisma.monthlyReview.findFirst({
      where: { userId: user.id, year },
      orderBy: [{ month: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.dailyTodo.findMany({
      where: {
        userId: user.id,
        date: { gte: fromDateOnly(weekFrom), lte: fromDateOnly(today) },
      },
    }),
  ]);

  const unread = await evaluateNudgesForUser({
    userId: user.id,
    locale,
    reflection: reflection
      ? {
          healingThings: reflection.healingThings,
          happiestMoment: reflection.happiestMoment,
          expectationsNextYear: reflection.expectationsNextYear,
        }
      : null,
    monthly: monthly ? monthlyToNudgeInput(monthly) : null,
    weekTodos: todos,
    weekFrom,
    weekTo: today,
  });

  return NextResponse.json({ ok: true, nudges: unread });
}
