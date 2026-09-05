import type { ReminderCadence } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dueReminderKinds } from "@/lib/reminders/engine";
import { reminderCopyFor } from "@/lib/reminders/copy";
import { loadReminderFacts } from "@/lib/reminders/context";
import { KIND_CADENCE, KIND_HREF, type ReminderKind } from "@/lib/reminders/kinds";
import { shouldPushLine } from "@/lib/reminders/channel";
import { resolveLinePushState } from "@/lib/line/reachability";
import { isLineMessagingConfigured } from "@/lib/env";
import { digestMessages, withOpenLink } from "@/lib/line/oa-digest";
import { pushLineText } from "@/lib/line/messaging";
import { toLogDto } from "@/lib/reminders/schema";

export async function dispatchDueReminders(now = new Date(), catchUp = true) {
  if (!process.env.DATABASE_URL) return { sent: 0, skipped: 0 };

  const prefs = await prisma.reminderPreference.findMany({
    where: { cadence: "DAILY", enabled: true },
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
    const result = await dispatchUserReminders({
      userId: row.userId,
      locale: row.user.preferredLocale === "en" ? "en" : "th",
      lineUserId: row.user.lineAccount?.lineUserId,
      lineReachable: Boolean(row.user.lineAccount?.reachable),
      lineOptIn: Boolean(row.user.lineAccount?.reminderOptIn),
      now,
      catchUp,
    });
    sent += result.sent;
    skipped += result.skipped;
  }

  return { sent, skipped };
}

export async function dispatchUserReminders(input: {
  userId: string;
  locale: "th" | "en";
  lineUserId?: string | null;
  lineReachable: boolean;
  lineOptIn?: boolean;
  now?: Date;
  catchUp?: boolean;
}) {
  const now = input.now ?? new Date();
  const master = await prisma.reminderPreference.findUnique({
    where: { userId_cadence: { userId: input.userId, cadence: "DAILY" } },
    select: { enabled: true },
  });
  if (!master?.enabled) return { sent: 0, skipped: 1, logs: [] as ReturnType<typeof toLogDto>[] };

  const facts = await loadReminderFacts(input.userId, now);
  facts.enabled = true;
  const due = dueReminderKinds(facts, now, { catchUp: input.catchUp ?? true });
  if (due.length === 0) return { sent: 0, skipped: 1, logs: [] as ReturnType<typeof toLogDto>[] };

  const lineState = await resolveLinePushState({
    userId: input.userId,
    lineUserId: input.lineUserId,
    reminderOptIn: input.lineOptIn,
    reachable: input.lineReachable,
  });

  const useLine = shouldPushLine({
    configured: isLineMessagingConfigured(),
    reachable: lineState.reachable,
    optIn: lineState.optIn,
    lineUserId: lineState.lineUserId,
  });

  const logs = [];
  const lineMessages: unknown[] = [];

  for (const kind of due) {
    const result = await persistKind({
      userId: input.userId,
      kind,
      locale: input.locale,
      facts,
      useLine,
      now,
    });
    if (!result) continue;
    logs.push(result.log);
    if (useLine) lineMessages.push(...result.messages);
  }

  if (useLine && lineState.lineUserId && lineMessages.length > 0) {
    const push = await pushLineText(lineState.lineUserId, lineMessages.slice(0, 5));
    if (!push.ok) {
      console.warn("[reminders-line-push]", input.userId, push.status);
      if (push.unreachable) {
        await prisma.lineAccount.updateMany({
          where: { lineUserId: lineState.lineUserId },
          data: { reachable: false, unfollowedAt: new Date() },
        });
      }
    }
  }

  return { sent: logs.length, skipped: due.length - logs.length, logs };
}

async function persistKind(input: {
  userId: string;
  kind: ReminderKind;
  locale: "th" | "en";
  facts: Awaited<ReturnType<typeof loadReminderFacts>>;
  useLine: boolean;
  now: Date;
}) {
  const copy = reminderCopyFor(input.kind, input.locale, input.facts, input.now);
  const cadence = KIND_CADENCE[input.kind];
  const channel = input.useLine ? "LINE" : "IN_APP";
  try {
    const log = await prisma.$transaction(async (tx) => {
      const created = await tx.reminderLog.create({
        data: {
          userId: input.userId,
          cadence,
          kind: input.kind,
          channel,
          title: copy.title,
          body: copy.body,
        },
      });
      await tx.reminderPreference.updateMany({
        where: { userId: input.userId, cadence },
        data: { lastSentAt: input.now },
      });
      return created;
    });
    const text = withOpenLink(input.locale, `${copy.title}\n\n${copy.body}`, copy.href);
    return {
      log: { ...toLogDto(log), href: KIND_HREF[input.kind] },
      messages: digestMessages(input.locale, text),
    };
  } catch {
    return null;
  }
}

/** @deprecated Prefer dispatchUserReminders — kept for old POST { cadence } clients. */
export async function dispatchOne(input: {
  userId: string;
  cadence: ReminderCadence;
  locale: "th" | "en";
  lineUserId?: string | null;
  lineReachable: boolean;
  lineOptIn?: boolean;
  now?: Date;
}) {
  return dispatchUserReminders(input);
}
