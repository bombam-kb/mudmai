import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { isLineLoginConfigured, isLineMessagingConfigured } from "@/lib/env";
import { getLineLinkStatus, unlinkLineAccount } from "@/lib/line/account";
import { refreshLineReachability } from "@/lib/line/reachability";
import { isLinePlaceholderEmail } from "@/lib/line/oauth";
import { rateLimitJson } from "@/lib/http/rate-limit";

export async function GET(request: Request) {
  const auth = await requireApiUser({
    allowMissingPdpa: true,
    allowIncompleteOnboarding: true,
  });
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const probe = url.searchParams.get("probe") === "1";

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }
  const status = await getLineLinkStatus(auth.user.id);
  if (status.linked && probe) {
    await refreshLineReachability(auth.user.id).catch(() => null);
  }
  const fresh = status.linked && probe ? await getLineLinkStatus(auth.user.id) : status;
  const messagingConfigured = isLineMessagingConfigured();
  let lineReminderStatus: "ready" | "off" | "unlinked" | "unreachable" | "no_messaging" =
    "unlinked";
  if (!messagingConfigured) lineReminderStatus = "no_messaging";
  else if (!fresh.linked) lineReminderStatus = "unlinked";
  else if (!fresh.reminderOptIn) lineReminderStatus = "off";
  else if (!fresh.reachable) lineReminderStatus = "unreachable";
  else lineReminderStatus = "ready";

  return NextResponse.json({
    ok: true,
    loginConfigured: isLineLoginConfigured(),
    messagingConfigured,
    lineReminderStatus,
    addFriendUrl: process.env.NEXT_PUBLIC_LINE_OA_BASIC_ID
      ? `https://line.me/R/ti/p/${process.env.NEXT_PUBLIC_LINE_OA_BASIC_ID}`
      : null,
    ...fresh,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const limited = await rateLimitJson(`line-account:${auth.user.id}`, 40);
  if (limited) return limited;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    reminderOptIn?: boolean;
    broadcastOptIn?: boolean;
  };

  const data: { reminderOptIn?: boolean; broadcastOptIn?: boolean } = {};
  if (typeof body.reminderOptIn === "boolean") data.reminderOptIn = body.reminderOptIn;
  if (typeof body.broadcastOptIn === "boolean") data.broadcastOptIn = body.broadcastOptIn;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
  }

  const updated = await prisma.lineAccount.updateMany({
    where: { userId: auth.user.id },
    data,
  });
  if (updated.count === 0) {
    return NextResponse.json({ ok: false, error: "unlinked" }, { status: 404 });
  }
  const status = await getLineLinkStatus(auth.user.id);
  return NextResponse.json({ ok: true, ...status });
}

export async function DELETE() {
  const auth = await requireApiUser({
    allowMissingPdpa: true,
    allowIncompleteOnboarding: true,
  });
  if (!auth.ok) return auth.response;
  const limited = await rateLimitJson(`line-account:${auth.user.id}`, 20);
  if (limited) return limited;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { email: true },
  });
  if (isLinePlaceholderEmail(profile?.email)) {
    return NextResponse.json({ ok: false, error: "line_only" }, { status: 400 });
  }

  await unlinkLineAccount(auth.user.id);
  return NextResponse.json({ ok: true, linked: false });
}
