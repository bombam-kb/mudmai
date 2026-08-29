import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { dispatchOne } from "@/lib/reminders/dispatch";
import { CADENCES, toLogDto, type CadenceId } from "@/lib/reminders/schema";
import { rateLimitJson } from "@/lib/http/rate-limit";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const logs = await prisma.reminderLog.findMany({
    where: { userId: user.id },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    ok: true,
    logs: logs.map(toLogDto),
    unread: logs.filter((log) => !log.isRead).length,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`reminders-write:${user.id}`, 60);
  if (limited) return limited;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    cadence?: string;
  } | null;
  const cadence = String(body?.cadence ?? "") as CadenceId;
  if (!CADENCES.includes(cadence)) {
    return NextResponse.json({ ok: false, error: "cadence" }, { status: 400 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      preferredLocale: true,
      lineAccount: true,
    },
  });
  const result = await dispatchOne({
    userId: user.id,
    cadence,
    locale: profile?.preferredLocale === "en" ? "en" : "th",
    lineUserId: profile?.lineAccount?.lineUserId,
    lineReachable: Boolean(profile?.lineAccount?.reachable),
    lineOptIn: Boolean(profile?.lineAccount?.reminderOptIn),
  });
  if (result === "skipped") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const log = await prisma.reminderLog.findFirst({
    where: { userId: user.id, cadence },
    orderBy: { sentAt: "desc" },
  });
  return NextResponse.json({ ok: true, log: log ? toLogDto(log) : undefined });
}

export async function PATCH() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`reminders-write:${user.id}`, 60);
  if (limited) return limited;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  await prisma.reminderLog.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  return NextResponse.json({ ok: true });
}
