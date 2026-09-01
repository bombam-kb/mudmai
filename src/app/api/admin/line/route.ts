import { NextResponse } from "next/server";
import { requireAdminSecret } from "@/lib/auth/require-admin";
import { adminUnlinkLine, listAdminLineLinks } from "@/lib/admin/directory";
import { rateLimitJson } from "@/lib/http/rate-limit";

export async function GET(request: Request) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const limited = await rateLimitJson("admin-directory", 180);
  if (limited) return limited;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }

  const links = await listAdminLineLinks().catch(() => null);
  if (!links) {
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    total: links.length,
    reachable: links.filter((row) => row.reachable).length,
    links,
  });
}

export async function DELETE(request: Request) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const limited = await rateLimitJson("admin-line-unlink", 60);
  if (limited) return limited;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    lineUserId?: string;
  };
  const result = await adminUnlinkLine(body).catch(() => null);
  if (!result) {
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 404 });
  }
  return NextResponse.json({ ok: true, userId: result.userId });
}
