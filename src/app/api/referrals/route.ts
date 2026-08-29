import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { ensureReferralCode } from "@/lib/referrals/code";
import { getReferralSummary } from "@/lib/referrals/service";

export async function GET() {
  const auth = await requireApiUser({ allowIncompleteOnboarding: true });
  if (!auth.ok) return auth.response;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const [code, summary] = await Promise.all([
    ensureReferralCode(auth.user.id),
    getReferralSummary(auth.user.id),
  ]).catch(() => [null, null] as const);

  if (!code || !summary) {
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, code, ...summary });
}
