import type { ReminderPrefDto, CadenceId } from "@/lib/reminders/schema";
import {
  bangkokClock,
  calendarParts,
  isLastWeekOfQuarter,
  monthBounds,
} from "@/lib/year";

export function periodKey(cadence: CadenceId, at: Date | string) {
  const parts = typeof at === "string" ? calendarParts(new Date(at)) : calendarParts(at);
  switch (cadence) {
    case "DAILY":
      return parts.ymd;
    case "WEEKLY":
      return `${parts.year}-${weekStartSunday(parts.ymd)}`;
    case "MONTHLY":
      return `${parts.year}-${parts.month}`;
    case "QUARTERLY":
      return `${parts.year}-Q${parts.quarter}`;
  }
}

function weekStartSunday(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() - utc.getUTCDay());
  return utc.toISOString().slice(0, 10);
}

const DAILY_WINDOW_MINUTES = 120;

export function isCadenceDue(pref: ReminderPrefDto, now = new Date()) {
  if (!pref.enabled) return false;
  const clock = bangkokClock(now);
  const nowMin = clock.hour * 60 + clock.minute;
  const dueMin = pref.hour * 60 + pref.minute;
  if (nowMin < dueMin) {
    return false;
  }
  if (pref.lastSentAt && periodKey(pref.cadence, pref.lastSentAt) === periodKey(pref.cadence, now)) {
    return false;
  }
  const inDailyWindow = nowMin <= dueMin + DAILY_WINDOW_MINUTES;
  switch (pref.cadence) {
    case "DAILY":
      return inDailyWindow;
    case "WEEKLY":
      return clock.weekday === (pref.weekday ?? 0) && inDailyWindow;
    case "MONTHLY":
      return clock.ymd === monthBounds(clock.year, clock.month).end;
    case "QUARTERLY":
      return isLastWeekOfQuarter(clock.ymd);
  }
}

export function dueCadences(prefs: ReminderPrefDto[], now = new Date()) {
  return prefs.filter((pref) => isCadenceDue(pref, now));
}
