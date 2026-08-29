import type { ReminderCadence } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isCadenceDue } from "@/lib/reminders/engine";
import { REMINDER_COPY } from "@/lib/reminders/copy";
import { toPrefDto } from "@/lib/reminders/schema";
import { shouldPushLine } from "@/lib/reminders/channel";
import { isLineMessagingConfigured } from "@/lib/env";
import { pushLineText, reminderPushMessages } from "@/lib/line/messaging";

export async function dispatchDueReminders(now = new Date()) {
  if (!process.env.DATABASE_URL) return { sent: 0, skipped: 0 };

  const prefs = await prisma.reminderPreference.findMany({
    where: { enabled: true },
    include: {
      user: {
        select: {
          id: true,
          preferredLocale: true,
          lineAccount: true,
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const row of prefs) {
    const pref = toPrefDto(row);
    if (!isCadenceDue(pref, now)) {
      skipped += 1;
      continue;
    }
    const result = await dispatchOne({
      userId: row.userId,
      cadence: row.cadence,
      locale: row.user.preferredLocale === "en" ? "en" : "th",
      lineUserId: row.user.lineAccount?.lineUserId,
      lineReachable: Boolean(row.user.lineAccount?.reachable),
      lineOptIn: Boolean(row.user.lineAccount?.reminderOptIn),
      now,
    });
    if (result === "sent") sent += 1;
    else skipped += 1;
  }

  return { sent, skipped };
}

export async function dispatchOne(input: {
  userId: string;
  cadence: ReminderCadence;
  locale: "th" | "en";
  lineUserId?: string | null;
  lineReachable: boolean;
  lineOptIn?: boolean;
  now?: Date;
}) {
  const prefRow = await prisma.reminderPreference.findUnique({
    where: { userId_cadence: { userId: input.userId, cadence: input.cadence } },
  });
  if (!prefRow || !isCadenceDue(toPrefDto(prefRow), input.now)) {
    return "skipped" as const;
  }

  const copy = REMINDER_COPY[input.locale][input.cadence];
  const pref = toPrefDto(prefRow);
  const useLine = shouldPushLine({
    channel: pref.channel,
    configured: isLineMessagingConfigured(),
    reachable: input.lineReachable,
    optIn: Boolean(input.lineOptIn),
    lineUserId: input.lineUserId,
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.reminderLog.create({
        data: {
          userId: input.userId,
          cadence: input.cadence,
          channel: useLine ? "LINE" : pref.channel === "BROWSER" ? "BROWSER" : "IN_APP",
          title: copy.title,
          body: copy.body,
        },
      });
      await tx.reminderPreference.update({
        where: {
          userId_cadence: { userId: input.userId, cadence: input.cadence },
        },
        data: { lastSentAt: new Date() },
      });
    });
  } catch {
    return "skipped" as const;
  }

  if (useLine && input.lineUserId) {
    const push = await pushLineText(
      input.lineUserId,
      reminderPushMessages(input.locale, input.cadence),
    );
    if (!push.ok && push.unreachable) {
      await prisma.lineAccount.updateMany({
        where: { lineUserId: input.lineUserId },
        data: { reachable: false, unfollowedAt: new Date() },
      });
    }
  }

  return "sent" as const;
}
