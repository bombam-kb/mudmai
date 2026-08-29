import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/http/rate-limit";
import { isMoodLevel, parseMoodPut } from "@/lib/mood/schema";
import { fromDateOnly, isYmd, localYmd } from "@/lib/year";
import { forbidIfRenewal } from "@/lib/billing/guard";
import { yearFromYmd } from "@/lib/billing/plan";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const date = dateParam && isYmd(dateParam) ? dateParam : localYmd();

  const row = prisma.dailyMood
    ? await prisma.dailyMood
        .findUnique({
          where: { userId_date: { userId: user.id, date: fromDateOnly(date) } },
        })
        .catch(() => null)
    : null;

  return NextResponse.json({
    ok: true,
    date,
    level: row && isMoodLevel(row.level) ? row.level : null,
  });
}

export async function PUT(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const limited = await consumeRateLimit(`mood:${user.id}`, 40, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "rate" }, { status: 429 });
  }

  const parsed = parseMoodPut(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const renew = forbidIfRenewal(auth.profile?.createdAt, yearFromYmd(parsed.date));
  if (renew) return renew;

  if (!prisma.dailyMood) {
    return NextResponse.json({ ok: false, reason: "client" }, { status: 503 });
  }

  const row = await prisma.dailyMood.upsert({
    where: { userId_date: { userId: user.id, date: fromDateOnly(parsed.date) } },
    create: {
      userId: user.id,
      date: fromDateOnly(parsed.date),
      level: parsed.level,
    },
    update: { level: parsed.level },
  });

  return NextResponse.json({ ok: true, date: parsed.date, level: row.level });
}
