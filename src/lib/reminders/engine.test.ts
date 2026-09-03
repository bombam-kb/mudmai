import { describe, expect, it } from "vitest";
import { dueReminderKinds, type ReminderFacts } from "./engine";
import { sentKey, type ReminderKind } from "./kinds";

function atBangkok(ymd: string, hour: number, minute = 0) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${ymd}T${hh}:${mm}:00+07:00`);
}

function facts(partial: Partial<ReminderFacts> = {}): ReminderFacts {
  return {
    enabled: true,
    weekTodoCount: 10,
    today: [],
    week: [],
    monthPlanned: true,
    nextMonthPlanned: true,
    quarterPlanned: true,
    nextQuarterPlanned: true,
    monthlyReviewDone: false,
    quarterlyReviewDone: false,
    sent: new Set(),
    ...partial,
  };
}

function due(partial: Partial<ReminderFacts>, ymd: string, hour: number) {
  return dueReminderKinds(facts(partial), atBangkok(ymd, hour));
}

describe("dueReminderKinds", () => {
  it("sends nothing when notifications are off", () => {
    expect(due({ enabled: false, weekTodoCount: 80 }, "2026-09-07", 8)).toEqual([]);
  });

  it("light week: Monday morning start, not daily", () => {
    expect(due({ weekTodoCount: 49 }, "2026-09-07", 8)).toEqual(["WEEK_START"]);
    expect(due({ weekTodoCount: 49 }, "2026-09-08", 8)).toEqual([]);
  });

  it("heavy week: weekday morning and evening, with daily consent threshold at 50", () => {
    expect(due({ weekTodoCount: 50 }, "2026-09-07", 8)).toEqual(["DAILY_MORNING"]);
    expect(due({ weekTodoCount: 50 }, "2026-09-07", 19)).toEqual(["DAILY_EVENING"]);
    expect(due({ weekTodoCount: 50 }, "2026-09-08", 8)).toEqual(["DAILY_MORNING"]);
  });

  it("light week: Friday evening close, Sunday evening summary", () => {
    expect(due({ weekTodoCount: 12 }, "2026-09-04", 19)).toEqual(["WEEK_END"]);
    expect(due({ weekTodoCount: 12 }, "2026-09-06", 19)).toEqual(["WEEKLY_SUMMARY"]);
  });

  it("heavy week: Saturday catch-up and Sunday weekly summary", () => {
    expect(due({ weekTodoCount: 60 }, "2026-09-05", 10)).toEqual(["SATURDAY_CATCHUP"]);
    expect(due({ weekTodoCount: 60 }, "2026-09-06", 19)).toEqual(["WEEKLY_SUMMARY"]);
  });

  it("skips outside the time window", () => {
    expect(due({ weekTodoCount: 50 }, "2026-09-07", 7)).toEqual([]);
    expect(due({ weekTodoCount: 50 }, "2026-09-07", 11)).toEqual([]);
  });

  it("skips a kind already sent this period", () => {
    const now = atBangkok("2026-09-07", 8);
    const kind: ReminderKind = "DAILY_MORNING";
    expect(
      dueReminderKinds(
        facts({ weekTodoCount: 50, sent: new Set([sentKey(kind, now)]) }),
        now,
      ),
    ).toEqual([]);
  });

  it("month and quarter start/end overlay the weekly schedule", () => {
    expect(due({ weekTodoCount: 10 }, "2026-10-01", 8)).toEqual(["MONTH_START", "QUARTER_START"]);
    expect(due({ weekTodoCount: 10 }, "2026-09-30", 19)).toEqual(["MONTH_END", "QUARTER_END"]);
  });

  it("catch-up delivers morning reminders after the strict window", () => {
    expect(
      dueReminderKinds(facts({ weekTodoCount: 50 }), atBangkok("2026-09-07", 21), { catchUp: true }),
    ).toEqual(["DAILY_MORNING", "DAILY_EVENING"]);
  });

  it("catch-up still skips before slot start", () => {
    expect(
      dueReminderKinds(facts({ weekTodoCount: 50 }), atBangkok("2026-09-07", 7), { catchUp: true }),
    ).toEqual([]);
  });

  it("heavy last day of month also keeps the evening task ping", () => {
    expect(due({ weekTodoCount: 50 }, "2026-09-30", 19)).toEqual([
      "DAILY_EVENING",
      "MONTH_END",
      "QUARTER_END",
    ]);
  });
});
