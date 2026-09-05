import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { loadMonthlyReflex } from "@/lib/reviews/reflex";
import { rateLimitJson } from "@/lib/http/rate-limit";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`reflex:${user.id}`, 60);
  if (limited) return limited;

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  if (!Number.isInteger(year) || year < 2000 || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ ok: false, error: "period" }, { status: 400 });
  }

  const recap = await loadMonthlyReflex(user.id, year, month);
  if (!recap) {
    return NextResponse.json({ ok: false, error: "missing" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, recap });
}
