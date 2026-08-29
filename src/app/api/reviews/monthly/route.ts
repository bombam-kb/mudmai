import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { evaluateNudgesForUser, monthlyToNudgeInput } from "@/lib/nudge/evaluate";
import { parseMonthlyPayload, ratingsToDb, toMonthlyDto } from "@/lib/reviews/schema";
import { activeCalendarYear } from "@/lib/year";
import { rateLimitJson } from "@/lib/http/rate-limit";
import { forbidIfRenewal } from "@/lib/billing/guard";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year") ?? activeCalendarYear());
  const month = url.searchParams.get("month");

  const reviews = await prisma.monthlyReview
    .findMany({
      where: {
        userId: user.id,
        year,
        ...(month ? { month: Number(month) } : {}),
      },
      orderBy: { month: "asc" },
    })
    .catch(() => []);

  return NextResponse.json({
    ok: true,
    year,
    reviews: reviews.map(toMonthlyDto),
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

  const parsed = parseMonthlyPayload(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const renew = forbidIfRenewal(auth.profile?.createdAt, parsed.data.year);
  if (renew) return renew;

  const { ratings, ...rest } = parsed.data;
  const fields = {
    ...rest,
    ...ratingsToDb(ratings),
  };

  const review = await prisma.monthlyReview.upsert({
    where: {
      userId_year_month: {
        userId: user.id,
        year: parsed.data.year,
        month: parsed.data.month,
      },
    },
    create: { userId: user.id, ...fields },
    update: fields,
  });

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { preferredLocale: true },
  });
  const reflection = await prisma.pastYearReflection.findUnique({
    where: { userId_year: { userId: user.id, year: parsed.data.year } },
  });
  await evaluateNudgesForUser({
    userId: user.id,
    locale: profile?.preferredLocale === "en" ? "en" : "th",
    reflection: reflection
      ? {
          healingThings: reflection.healingThings,
          happiestMoment: reflection.happiestMoment,
          expectationsNextYear: reflection.expectationsNextYear,
        }
      : null,
    monthly: monthlyToNudgeInput(review),
    weekTodos: [],
    weekFrom: `${parsed.data.year}-${String(parsed.data.month).padStart(2, "0")}-01`,
    weekTo: `${parsed.data.year}-${String(parsed.data.month).padStart(2, "0")}-01`,
  }).catch(() => []);

  return NextResponse.json({ ok: true, review: toMonthlyDto(review) });
}
