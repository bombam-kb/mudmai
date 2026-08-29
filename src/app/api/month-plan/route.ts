import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { rateLimitJson } from "@/lib/http/rate-limit";
import { findMonthPlan, saveMonthPlan } from "@/lib/month-plan/db";
import {
  emptyMonthPlan,
  isYearMonth,
  parseMonthPlanPut,
  toMonthPlanDto,
} from "@/lib/month-plan/schema";
import { calendarParts } from "@/lib/year";
import { forbidIfRenewal } from "@/lib/billing/guard";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const url = new URL(request.url);
  const parts = calendarParts();
  const year = Number(url.searchParams.get("year") ?? parts.year);
  const month = Number(url.searchParams.get("month") ?? parts.month);
  if (!isYearMonth(year, month)) {
    return NextResponse.json({ ok: false, error: "period" }, { status: 400 });
  }

  const row = await findMonthPlan(user.id, year, month).catch(() => null);
  return NextResponse.json({
    ok: true,
    plan: row ? toMonthPlanDto(row) : emptyMonthPlan(year, month),
  });
}

export async function PUT(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const limited = await rateLimitJson(`month-plan:${user.id}`, 80);
  if (limited) return limited;

  const parsed = parseMonthPlanPut(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const renew = forbidIfRenewal(auth.profile?.createdAt, parsed.data.year);
  if (renew) return renew;

  try {
    await ensureProfile(user).catch(() => null);
    const row = await saveMonthPlan(user.id, parsed.data);
    return NextResponse.json({ ok: true, plan: toMonthPlanDto(row) });
  } catch (error) {
    console.error("month-plan PUT", error);
    return NextResponse.json({ ok: false, error: "save" }, { status: 500 });
  }
}
