import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { dispatchUserReminders } from "@/lib/reminders/dispatch";
import { toLogDto } from "@/lib/reminders/schema";
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

export async function POST() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`reminders-write:${user.id}`, 60);
  if (limited) return limited;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      preferredLocale: true,
      lineAccount: true,
    },
  });
  const result = await dispatchUserReminders({
    userId: user.id,
    locale: profile?.preferredLocale === "en" ? "en" : "th",
    lineUserId: profile?.lineAccount?.lineUserId,
    lineReachable: Boolean(profile?.lineAccount?.reachable),
    lineOptIn: Boolean(profile?.lineAccount?.reminderOptIn),
  });
  if (result.sent === 0) {
    return NextResponse.json({ ok: true, skipped: true, logs: [] });
  }

  return NextResponse.json({ ok: true, logs: result.logs });
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
