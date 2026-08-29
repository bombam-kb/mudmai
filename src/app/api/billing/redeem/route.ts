import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { rateLimitJson } from "@/lib/http/rate-limit";
import { redeemPointsForFreeRenewal } from "@/lib/referrals/service";

export async function POST() {
  const auth = await requireApiUser({ allowIncompleteOnboarding: true });
  if (!auth.ok) return auth.response;

  const limited = await rateLimitJson(`billing-redeem:${auth.user.id}`, 5);
  if (limited) return limited;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const result = await redeemPointsForFreeRenewal(auth.user.id).catch(() => null);
  if (!result) {
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.reason, balance: result.balance, costThb: result.costThb },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    balance: result.balance,
    checkout: { id: result.checkout.id, status: result.checkout.status },
  });
}
