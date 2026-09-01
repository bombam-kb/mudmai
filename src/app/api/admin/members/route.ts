import { NextResponse } from "next/server";
import { requireAdminSecret } from "@/lib/auth/require-admin";
import { listAdminMembers } from "@/lib/admin/directory";
import { rateLimitJson } from "@/lib/http/rate-limit";

export async function GET(request: Request) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const limited = await rateLimitJson("admin-directory", 180);
  if (limited) return limited;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }

  const members = await listAdminMembers().catch(() => null);
  if (!members) {
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    total: members.length,
    linked: members.filter((row) => row.lineUserId).length,
    members,
  });
}
