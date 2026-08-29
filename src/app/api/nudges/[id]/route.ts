import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { toNudgeDto } from "@/lib/nudge/schema";
import { rateLimitJson } from "@/lib/http/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`nudges:${user.id}`, 40);
  if (limited) return limited;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const { id } = await params;
  const existing = await prisma.aiNudgeLog.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ ok: false }, { status: 404 });

  const log = await prisma.aiNudgeLog.update({
    where: { id },
    data: { isRead: true },
  });
  return NextResponse.json({ ok: true, nudge: toNudgeDto(log) });
}
