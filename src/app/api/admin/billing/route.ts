import { NextResponse } from "next/server";
import { requireAdminSecret } from "@/lib/auth/require-admin";
import { listAdminCheckouts } from "@/lib/admin/directory";
import { rateLimitJson } from "@/lib/http/rate-limit";

export async function GET(request: Request) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const limited = await rateLimitJson("admin-directory", 180);
  if (limited) return limited;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }

  const checkouts = await listAdminCheckouts().catch(() => null);
  if (!checkouts) {
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }

  const paidUserIds = new Set(
    checkouts.filter((row) => row.status === "PAID").map((row) => row.user.id),
  );

  return NextResponse.json({
    ok: true,
    paidUsers: paidUserIds.size,
    pending: checkouts.filter((row) => row.status === "PENDING").length,
    checkouts,
  });
}
