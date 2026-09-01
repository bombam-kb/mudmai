import type { ReminderCadence } from "@prisma/client";
import { bangkokClock, mondayWeekBounds, monthBounds, quarterBounds } from "@/lib/year";

export const HEAVY_WEEK_TODOS = 50;

export const REMINDER_KINDS = [
  "DAILY_MORNING",
  "DAILY_EVENING",
  "WEEK_START",
  "WEEK_END",
  "SATURDAY_CATCHUP",
  "WEEKLY_SUMMARY",
  "MONTH_START",
  "MONTH_END",
  "QUARTER_START",
  "QUARTER_END",
] as const;

export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const KIND_CADENCE: Record<ReminderKind, ReminderCadence> = {
  DAILY_MORNING: "DAILY",
  DAILY_EVENING: "DAILY",
  WEEK_START: "DAILY",
  WEEK_END: "WEEKLY",
  SATURDAY_CATCHUP: "WEEKLY",
  WEEKLY_SUMMARY: "WEEKLY",
  MONTH_START: "MONTHLY",
  MONTH_END: "MONTHLY",
  QUARTER_START: "QUARTERLY",
  QUARTER_END: "QUARTERLY",
};

export const KIND_HREF: Record<ReminderKind, string> = {
  DAILY_MORNING: "/todos",
  DAILY_EVENING: "/todos",
  WEEK_START: "/home",
  WEEK_END: "/home",
  SATURDAY_CATCHUP: "/todos",
  WEEKLY_SUMMARY: "/home",
  MONTH_START: "/calendar",
  MONTH_END: "/reviews/monthly",
  QUARTER_START: "/goals",
  QUARTER_END: "/reviews/quarterly",
};

type Slot = { hour: number; minute: number; window: number };

export const KIND_SLOT: Record<ReminderKind, Slot> = {
  DAILY_MORNING: { hour: 8, minute: 0, window: 120 },
  WEEK_START: { hour: 8, minute: 0, window: 120 },
  MONTH_START: { hour: 8, minute: 0, window: 120 },
  QUARTER_START: { hour: 8, minute: 0, window: 120 },
  SATURDAY_CATCHUP: { hour: 10, minute: 0, window: 120 },
  DAILY_EVENING: { hour: 19, minute: 0, window: 120 },
  WEEK_END: { hour: 19, minute: 0, window: 120 },
  WEEKLY_SUMMARY: { hour: 19, minute: 0, window: 120 },
  MONTH_END: { hour: 19, minute: 0, window: 120 },
  QUARTER_END: { hour: 19, minute: 0, window: 120 },
};

export function isHeavyWeek(todoCount: number) {
  return todoCount >= HEAVY_WEEK_TODOS;
}

export function inTimeWindow(now: Date, slot: Slot) {
  const clock = bangkokClock(now);
  const nowMin = clock.hour * 60 + clock.minute;
  const dueMin = slot.hour * 60 + slot.minute;
  return nowMin >= dueMin && nowMin <= dueMin + slot.window;
}

export function kindPeriodKey(kind: ReminderKind, now: Date) {
  const clock = bangkokClock(now);
  switch (kind) {
    case "DAILY_MORNING":
    case "DAILY_EVENING":
      return clock.ymd;
    case "WEEK_START":
    case "WEEK_END":
    case "SATURDAY_CATCHUP":
    case "WEEKLY_SUMMARY":
      return mondayWeekBounds(clock.ymd).start;
    case "MONTH_START":
    case "MONTH_END":
      return `${clock.year}-${clock.month}`;
    case "QUARTER_START":
    case "QUARTER_END":
      return `${clock.year}-Q${clock.quarter}`;
  }
}

export function sentKey(kind: ReminderKind, now: Date) {
  return `${kind}:${kindPeriodKey(kind, now)}`;
}

export function isMonthBoundary(now: Date, edge: "start" | "end") {
  const clock = bangkokClock(now);
  const bounds = monthBounds(clock.year, clock.month);
  return clock.ymd === (edge === "start" ? bounds.start : bounds.end);
}

export function isQuarterBoundary(now: Date, edge: "start" | "end") {
  const clock = bangkokClock(now);
  const bounds = quarterBounds(clock.year, clock.quarter);
  return clock.ymd === (edge === "start" ? bounds.start : bounds.end);
}
