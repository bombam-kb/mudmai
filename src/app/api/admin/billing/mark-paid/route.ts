import { NextResponse } from "next/server";
import { requireAdminSecret } from "@/lib/auth/require-admin";
import { markCheckoutPaid } from "@/lib/referrals/service";
import { rateLimitJson } from "@/lib/http/rate-limit";

/**
 * Manual payment confirmation. PromptPay is a bank-transfer QR, not a real gateway with
 * webhooks — the operator checks the transfer slip, then calls this to flip the checkout to
 * PAID. That transition is also what unlocks affiliate referral points (see markCheckoutPaid).
 */
export async function POST(request: Request) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const limited = await rateLimitJson("admin-mark-paid", 60);
  if (limited) return limited;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { checkoutId?: string };
  if (!body.checkoutId) {
    return NextResponse.json({ ok: false, error: "checkoutId" }, { status: 400 });
  }

  const result = await markCheckoutPaid(body.checkoutId).catch(() => null);
  if (!result) {
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    checkout: { id: result.checkout.id, status: result.checkout.status },
    pointsAwarded: result.pointsAwarded,
    alreadyPaid: result.alreadyPaid,
  });
}
