import { bangkokClock } from "@/lib/year";
import {
  isHeavyWeek,
  isMonthBoundary,
  isQuarterBoundary,
  KIND_SLOT,
  sentKey,
  slotDue,
  type ReminderKind,
} from "@/lib/reminders/kinds";

export type DueReminderOptions = {
  /** After the scheduled time, still deliver until end of day (cron / app catch-up). */
  catchUp?: boolean;
};

export type ReminderTask = { title: string; date?: string; isCompleted: boolean };

export type ReminderFacts = {
  enabled: boolean;
  weekTodoCount: number;
  today: ReminderTask[];
  week: ReminderTask[];
  monthPlanned: boolean;
  nextMonthPlanned: boolean;
  quarterPlanned: boolean;
  nextQuarterPlanned: boolean;
  monthlyReviewDone: boolean;
  quarterlyReviewDone: boolean;
  sent: Set<string>;
};

export function dueReminderKinds(
  facts: ReminderFacts,
  now = new Date(),
  options: DueReminderOptions = {},
): ReminderKind[] {
  if (!facts.enabled) return [];
  const slotMode = options.catchUp ? "catchUp" : "strict";
  const clock = bangkokClock(now);
  const heavy = isHeavyWeek(facts.weekTodoCount);
  const weekday = clock.weekday;
  const candidates: ReminderKind[] = [];

  if (heavy) {
    if (weekday >= 1 && weekday <= 5) candidates.push("DAILY_MORNING", "DAILY_EVENING");
    if (weekday === 6) candidates.push("SATURDAY_CATCHUP");
    if (weekday === 0) candidates.push("WEEKLY_SUMMARY");
  } else {
    if (weekday === 1) candidates.push("WEEK_START");
    if (weekday === 5) candidates.push("WEEK_END");
    if (weekday === 0) candidates.push("WEEKLY_SUMMARY");
  }

  if (isMonthBoundary(now, "start")) candidates.push("MONTH_START");
  if (isMonthBoundary(now, "end")) candidates.push("MONTH_END");
  if (isQuarterBoundary(now, "start")) candidates.push("QUARTER_START");
  if (isQuarterBoundary(now, "end")) candidates.push("QUARTER_END");

  return unique(candidates).filter((kind) => {
    if (facts.sent.has(sentKey(kind, now))) return false;
    return slotDue(now, KIND_SLOT[kind], slotMode);
  });
}

function unique(kinds: ReminderKind[]) {
  return [...new Set(kinds)];
}
