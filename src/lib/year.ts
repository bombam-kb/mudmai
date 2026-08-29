/** Calendar-year cycle only (Jan 1 – Dec 31), per HANDOFF. Asia/Bangkok civil date. */

export function activeCalendarYear(now = new Date()) {
  return calendarParts(now).year;
}

export function lastCalendarYear(now = new Date()) {
  return calendarParts(now).year - 1;
}

export function currentQuarter(now = new Date()) {
  return calendarParts(now).quarter;
}

export function quarterBounds(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3;
  const start = `${year}-${String(startMonth + 1).padStart(2, "0")}-01`;
  const endUtc = new Date(Date.UTC(year, startMonth + 3, 0));
  const end = endUtc.toISOString().slice(0, 10);
  return { start, end };
}

export function isYmdInQuarter(ymd: string, year: number, quarter: number) {
  const { start, end } = quarterBounds(year, quarter);
  return ymd >= start && ymd <= end;
}

export function toDateOnly(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function fromDateOnly(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** Local calendar date in Asia/Bangkok (YYYY-MM-DD) — use for "today" todos. */
export function localYmd(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isYmd(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function formatLongYmd(ymd: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "th-TH", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fromDateOnly(ymd));
}

export function shiftYmd(ymd: string, days: number) {
  return addDaysYmd(ymd, days);
}

export function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

export type CalendarCell = {
  ymd: string;
  day: number;
  inMonth: boolean;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function ymdOf(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Monday-first 6-row month grid (42 cells). month is 1–12. UTC date-only. */
export function monthCells(year: number, month: number): CalendarCell[] {
  const firstUtc = new Date(Date.UTC(year, month - 1, 1));
  let mondayIndex = firstUtc.getUTCDay() - 1;
  if (mondayIndex < 0) mondayIndex = 6;
  const lastDate = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstYmd = ymdOf(year, month, 1);
  const cells: CalendarCell[] = [];

  for (let i = mondayIndex; i > 0; i--) {
    const ymd = addDaysYmd(firstYmd, -i);
    cells.push({ ymd, day: Number(ymd.slice(8, 10)), inMonth: false });
  }
  for (let day = 1; day <= lastDate; day++) {
    cells.push({ ymd: ymdOf(year, month, day), day, inMonth: true });
  }
  while (cells.length < 42) {
    const next = addDaysYmd(cells[cells.length - 1].ymd, 1);
    cells.push({
      ymd: next,
      day: Number(next.slice(8, 10)),
      inMonth: false,
    });
  }
  return cells;
}

/** Date-only arithmetic in UTC so month/quarter windows are timezone-safe. */
export function addDaysYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function calendarParts(now = new Date()) {
  const ymd = localYmd(now);
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(5, 7));
  const day = Number(ymd.slice(8, 10));
  const quarter = (Math.floor((month - 1) / 3) + 1) as 1 | 2 | 3 | 4;
  return { ymd, year, month, day, quarter };
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function bangkokClock(now = new Date()) {
  const parts = calendarParts(now);
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(now);
  const hourRaw = Number(formatted.find((part) => part.type === "hour")?.value ?? 0);
  const hour = hourRaw === 24 ? 0 : hourRaw;
  const minute = Number(formatted.find((part) => part.type === "minute")?.value ?? 0);
  const weekdayName = formatted.find((part) => part.type === "weekday")?.value ?? "Sun";
  const weekday = Math.max(
    0,
    WEEKDAY_SHORT.findIndex((name) => weekdayName.startsWith(name)),
  );
  return { ...parts, hour, minute, weekday };
}

export function isLastWeekOfQuarter(ymd: string) {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(5, 7));
  const quarter = Math.floor((month - 1) / 3) + 1;
  const { end } = quarterBounds(year, quarter);
  return ymd >= addDaysYmd(end, -6) && ymd <= end;
}

export function isMonthlyReviewWindow(now = new Date()) {
  const { ymd, year, month } = calendarParts(now);
  return ymd >= addDaysYmd(monthBounds(year, month).end, -2);
}

export function isQuarterlyReviewWindow(now = new Date()) {
  return isLastWeekOfQuarter(calendarParts(now).ymd);
}

