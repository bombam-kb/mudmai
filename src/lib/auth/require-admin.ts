import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function requireBearerSecret(request: Request, secret: string | undefined, missing: string) {
  if (!secret) {
    return NextResponse.json({ ok: false, error: missing }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  const matches = a.length === b.length && timingSafeEqual(a, b);
  if (!matches) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return null;
}

/** Gate for the internal mark-as-paid endpoint. No admin/role system exists yet, so this
 * checks a shared secret set only on the operator's own machine/host — never exposed to clients. */
export function requireAdminSecret(request: Request): NextResponse | null {
  return requireBearerSecret(request, process.env.ADMIN_SECRET, "not_configured");
}

/** Vercel/Railway cron. Send `Authorization: Bearer $CRON_SECRET`. */
export function requireCronSecret(request: Request): NextResponse | null {
  return requireBearerSecret(
    request,
    process.env.CRON_SECRET ?? process.env.ADMIN_SECRET,
    "not_configured",
  );
}
