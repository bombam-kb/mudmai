import type { ReminderCadence, ReminderChannel } from "@prisma/client";
import { REMINDER_HREF } from "@/lib/reminders/copy";

export const CADENCES = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"] as const;
export const CHANNELS = ["IN_APP", "BROWSER", "LINE"] as const;

export type CadenceId = (typeof CADENCES)[number];
export type ChannelId = (typeof CHANNELS)[number];

export type ReminderPrefDto = {
  cadence: CadenceId;
  enabled: boolean;
  hour: number;
  minute: number;
  weekday: number | null;
  channel: ChannelId;
  lastSentAt: string | null;
};

export type ReminderLogDto = {
  id: string;
  cadence: CadenceId;
  channel: ChannelId;
  title: string;
  body: string;
  href: string;
  isRead: boolean;
  sentAt: string;
};

export const DEFAULT_PREFS: ReminderPrefDto[] = [
  {
    cadence: "DAILY",
    enabled: true,
    hour: 21,
    minute: 0,
    weekday: null,
    channel: "IN_APP",
    lastSentAt: null,
  },
  {
    cadence: "WEEKLY",
    enabled: true,
    hour: 19,
    minute: 0,
    weekday: 0,
    channel: "IN_APP",
    lastSentAt: null,
  },
  {
    cadence: "MONTHLY",
    enabled: true,
    hour: 20,
    minute: 0,
    weekday: null,
    channel: "IN_APP",
    lastSentAt: null,
  },
  {
    cadence: "QUARTERLY",
    enabled: true,
    hour: 18,
    minute: 0,
    weekday: null,
    channel: "IN_APP",
    lastSentAt: null,
  },
];

export function mergePrefs(rows: ReminderPrefDto[]): ReminderPrefDto[] {
  return DEFAULT_PREFS.map((fallback) => {
    const found = rows.find((row) => row.cadence === fallback.cadence);
    return found ?? fallback;
  });
}

export function parsePrefPatch(input: unknown):
  | { ok: true; data: ReminderPrefDto }
  | { ok: false; error: string } {
  const body = (input ?? {}) as Record<string, unknown>;
  const cadence = String(body.cadence ?? "") as CadenceId;
  if (!CADENCES.includes(cadence)) return { ok: false, error: "cadence" };
  const hour = Number(body.hour);
  const minute = Number(body.minute);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return { ok: false, error: "hour" };
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    return { ok: false, error: "minute" };
  }
  const channel = String(body.channel ?? "IN_APP") as ChannelId;
  if (!CHANNELS.includes(channel)) return { ok: false, error: "channel" };
  let weekday: number | null = null;
  if (cadence === "WEEKLY") {
    weekday = Number(body.weekday ?? 0);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return { ok: false, error: "weekday" };
    }
  }
  return {
    ok: true,
    data: {
      cadence,
      enabled: Boolean(body.enabled),
      hour,
      minute,
      weekday,
      channel,
      lastSentAt:
        typeof body.lastSentAt === "string" || body.lastSentAt === null
          ? (body.lastSentAt as string | null)
          : null,
    },
  };
}

export function toPrefDto(row: {
  cadence: ReminderCadence;
  enabled: boolean;
  hour: number;
  minute: number;
  weekday: number | null;
  channel: ReminderChannel;
  lastSentAt: Date | null;
}): ReminderPrefDto {
  return {
    cadence: row.cadence,
    enabled: row.enabled,
    hour: row.hour,
    minute: row.minute,
    weekday: row.weekday,
    channel: row.channel,
    lastSentAt: row.lastSentAt ? row.lastSentAt.toISOString() : null,
  };
}

export function toLogDto(row: {
  id: string;
  cadence: ReminderCadence;
  channel: ReminderChannel;
  title: string;
  body: string;
  isRead: boolean;
  sentAt: Date;
}): ReminderLogDto {
  return {
    id: row.id,
    cadence: row.cadence,
    channel: row.channel,
    title: row.title,
    body: row.body,
    href: REMINDER_HREF[row.cadence],
    isRead: row.isRead,
    sentAt: row.sentAt.toISOString(),
  };
}
