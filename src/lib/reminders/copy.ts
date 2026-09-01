import { formatTodoDigest } from "@/lib/line/oa-digest";
import { KIND_HREF, isHeavyWeek, type ReminderKind } from "@/lib/reminders/kinds";
import type { ReminderFacts } from "@/lib/reminders/engine";
import { calendarParts } from "@/lib/year";

export const REMINDER_HREF = {
  DAILY: "/todos",
  WEEKLY: "/home",
  MONTHLY: "/reviews/monthly",
  QUARTERLY: "/reviews/quarterly",
} as const;

const MAX = 8;

export type ReminderCopy = { title: string; body: string; href: string };

function lines(
  locale: "th" | "en",
  todos: Array<{ title: string; isCompleted?: boolean }>,
  empty: string,
) {
  const open = todos.filter((todo) => !todo.isCompleted);
  if (open.length === 0) return empty;
  const list = open
    .slice(0, MAX)
    .map((todo) => `○ ${todo.title.slice(0, 60)}`)
    .join("\n");
  const more =
    open.length > MAX
      ? locale === "en"
        ? `\n+${open.length - MAX} more`
        : `\nอีก ${open.length - MAX} รายการ`
      : "";
  return `${list}${more}`;
}

function consent(locale: "th" | "en", count: number) {
  if (!isHeavyWeek(count)) return "";
  return locale === "en"
    ? `\nThis week has ${count} tasks. We’ll remind you each morning and evening so you can still hit your goal.`
    : `\nสัปดาห์นี้มีงาน ${count} รายการ ขออนุญาตเตือนทุกวันเช้า–เย็น เพื่อให้คุณทำได้ถึงเป้า`;
}

export function reminderCopyFor(
  kind: ReminderKind,
  locale: "th" | "en",
  facts: ReminderFacts,
  now = new Date(),
): ReminderCopy {
  const href = KIND_HREF[kind];
  const today = calendarParts(now).ymd;
  const todayOpen = facts.today.filter((todo) => !todo.isCompleted);
  const weekOpen = facts.week.filter((todo) => !todo.isCompleted);
  const todayDigest = formatTodoDigest(locale, today, facts.today);
  const weekList = lines(
    locale,
    weekOpen,
    locale === "en" ? "Nothing left open this week." : "สัปดาห์นี้เคลียร์ครบแล้ว",
  );

  if (locale === "en") {
    return englishCopy(kind, href, facts, todayDigest, todayOpen, weekList, weekOpen.length);
  }
  return thaiCopy(kind, href, facts, todayDigest, todayOpen, weekList, weekOpen.length);
}

function thaiCopy(
  kind: ReminderKind,
  href: string,
  facts: ReminderFacts,
  todayDigest: string,
  todayOpen: ReminderFacts["today"],
  weekList: string,
  weekOpenCount: number,
): ReminderCopy {
  const heavyNote = consent("th", facts.weekTodoCount);
  switch (kind) {
    case "DAILY_MORNING":
      return {
        title: "เช้านี้มีงานรออยู่",
        body: `${todayDigest}${heavyNote}`,
        href,
      };
    case "DAILY_EVENING":
      return {
        title: todayOpen.length ? "เย็นนี้ยังมีงานค้าง" : "วันนี้เคลียร์ครบแล้ว",
        body: todayOpen.length
          ? lines("th", todayOpen, "ไม่มีงานค้างวันนี้")
          : "วันนี้ทำครบแล้ว พักได้สบายใจ",
        href,
      };
    case "WEEK_START":
      return {
        title: "เริ่มสัปดาห์การทำงาน",
        body: `เช้าวันจันทร์ — ลุยงานสัปดาห์นี้ได้เลย\n${todayDigest}`,
        href,
      };
    case "WEEK_END":
      return {
        title: "จบวันทำงานสัปดาห์นี้",
        body: `เย็นวันศุกร์ — สิ่งที่ยังไม่เสร็จ:\n${weekList}`,
        href,
      };
    case "SATURDAY_CATCHUP":
      return {
        title: "สรุปงานค้างสัปดาห์นี้",
        body: `วันเสาร์ — ยังไม่ทำ ${weekOpenCount} รายการ\n${weekList}${consent("th", facts.weekTodoCount)}`,
        href,
      };
    case "WEEKLY_SUMMARY":
      return {
        title: "สรุปสัปดาห์นี้",
        body: `สัปดาห์นี้เสร็จ ${facts.week.filter((t) => t.isCompleted).length}/${facts.weekTodoCount} งาน\nยังค้าง:\n${weekList}\n\nเดือนนี้: ${facts.monthPlanned ? "มีแพลนแล้ว" : "ยังไม่ได้แพลนเดือน — เปิดแอปเพื่อวางแผน"}${facts.monthlyReviewDone ? "" : "\nยังไม่ได้รีวิวเดือนนี้"}`,
        href,
      };
    case "MONTH_START":
      return {
        title: "เริ่มเดือนใหม่",
        body: facts.monthPlanned
          ? "แพลนเดือนนี้พร้อมแล้ว — เปิดวันนี้แล้วเริ่มงานข้อแรกได้เลย"
          : "ยังไม่ได้แพลนเดือนนี้ เปิดแอปแล้วเขียนโฟกัสหรือเป้าเดือนนี้ก่อนเริ่ม",
        href,
      };
    case "MONTH_END":
      return {
        title: "ปิดเดือนนี้",
        body: `${facts.monthlyReviewDone ? "รีวิวเดือนนี้บันทึกแล้ว" : "ถึงเวลารีวิวเดือนนี้ — สิ่งที่รัก / สิ่งที่เลิก / สิ่งที่ต่อ"}\n${facts.nextMonthPlanned ? "เดือนถัดไปมีแพลนแล้ว" : "ยังไม่ได้แพลนเดือนถัดไป — เปิดแอปเพื่อวางแผน"}\nเปิดหมุดหมายบนเดสก์ท็อปหรือ iPad เพื่อสะท้อนเดือนนี้บนกระดานวิสัยทัศน์`,
        href,
      };
    case "QUARTER_START":
      return {
        title: "เริ่มไตรมาสใหม่",
        body: facts.quarterPlanned
          ? "เป้า SMART ไตรมาสนี้มีแล้ว — เปิดเป้าหมายแล้วเดินต่อได้เลย"
          : "ยังไม่มีเป้า SMART ไตรมาสนี้ เปิดเป้าหมายแล้ววางแผนก่อนเริ่ม",
        href,
      };
    case "QUARTER_END":
      return {
        title: "ปิดไตรมาสนี้",
        body: `${facts.quarterlyReviewDone ? "รีวิวไตรมาสนี้บันทึกแล้ว" : "ถึงเวลารีวิวไตรมาส — สกอร์การ์ดเป้า SMART และเรื่องเล่า"}\n${facts.nextQuarterPlanned ? "ไตรมาสถัดไปมีเป้าแล้ว" : "ยังไม่ได้แพลนไตรมาสถัดไป — เปิดเป้าหมายเพื่อวางแผน"}\nเปิดหมุดหมายบนเดสก์ท็อปหรือ iPad เพื่อสะท้อนไตรมาสนี้บนกระดานวิสัยทัศน์`,
        href,
      };
  }
}

function englishCopy(
  kind: ReminderKind,
  href: string,
  facts: ReminderFacts,
  todayDigest: string,
  todayOpen: ReminderFacts["today"],
  weekList: string,
  weekOpenCount: number,
): ReminderCopy {
  switch (kind) {
    case "DAILY_MORNING":
      return {
        title: "Here’s today’s list",
        body: `${todayDigest}${consent("en", facts.weekTodoCount)}`,
        href,
      };
    case "DAILY_EVENING":
      return {
        title: todayOpen.length ? "Still open this evening" : "Today is clear",
        body: todayOpen.length
          ? lines("en", todayOpen, "Nothing left today.")
          : "Everything on today’s list is done. Rest well.",
        href,
      };
    case "WEEK_START":
      return {
        title: "Start of the work week",
        body: `Monday morning — here’s the week’s first list.\n${todayDigest}`,
        href,
      };
    case "WEEK_END":
      return {
        title: "End of the work week",
        body: `Friday evening — still open:\n${weekList}`,
        href,
      };
    case "SATURDAY_CATCHUP":
      return {
        title: "This week’s leftovers",
        body: `Saturday — ${weekOpenCount} still open\n${weekList}${consent("en", facts.weekTodoCount)}`,
        href,
      };
    case "WEEKLY_SUMMARY":
      return {
        title: "This week in review",
        body: `Done ${facts.week.filter((t) => t.isCompleted).length}/${facts.weekTodoCount} this week\nStill open:\n${weekList}\n\nThis month: ${facts.monthPlanned ? "planned" : "not planned yet — open the app to plan"}${facts.monthlyReviewDone ? "" : "\nMonthly review still missing"}`,
        href,
      };
    case "MONTH_START":
      return {
        title: "New month",
        body: facts.monthPlanned
          ? "This month is planned — open Today and take the first step."
          : "This month isn’t planned yet. Open the app and write this month’s focus first.",
        href,
      };
    case "MONTH_END":
      return {
        title: "Close this month",
        body: `${facts.monthlyReviewDone ? "This month’s review is saved." : "Time for the monthly review — loved / stop / continue."}\n${facts.nextMonthPlanned ? "Next month is planned." : "Next month isn’t planned yet — open the app to plan."}\nOpen Mudmai on desktop or iPad to reflect on the vision board.`,
        href,
      };
    case "QUARTER_START":
      return {
        title: "New quarter",
        body: facts.quarterPlanned
          ? "This quarter’s SMART goals are in — open Goals and keep going."
          : "No SMART goals for this quarter yet. Open Goals and plan before you start.",
        href,
      };
    case "QUARTER_END":
      return {
        title: "Close this quarter",
        body: `${facts.quarterlyReviewDone ? "This quarter’s review is saved." : "Time for the quarterly review — SMART scorecard and a short story."}\n${facts.nextQuarterPlanned ? "Next quarter is planned." : "Next quarter isn’t planned yet — open Goals to plan."}\nOpen Mudmai on desktop or iPad to reflect on the vision board.`,
        href,
      };
  }
}

/** Static fallback used by older call sites. */
export const REMINDER_COPY: Record<
  "th" | "en",
  Record<"DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY", { title: string; body: string }>
> = {
  th: {
    DAILY: { title: "งานวันนี้ยังรออยู่", body: "เปิด Today แล้วปิดงานเล็ก ๆ สักข้อ — ก้าวเล็ก ๆ ก็ยังเดินทาง" },
    WEEKLY: { title: "สรุปสัปดาห์นี้", body: "อะไรเวิร์ก อะไรฝืด และโฟกัสสัปดาห์หน้าคืออะไร" },
    MONTHLY: { title: "ถึงเวลารีวิวเดือนนี้", body: "สิ่งที่รัก / สิ่งที่เลิก / สิ่งที่ต่อ — แล้วให้คะแนน 6 เสาหลัก" },
    QUARTERLY: { title: "ปิดไตรมาสนี้", body: "ดูสกอร์การ์ดเป้า SMART แล้ววางแผนไตรมาสถัดไป" },
  },
  en: {
    DAILY: { title: "Today’s todos are waiting", body: "Open Today and close one small task — small steps still count." },
    WEEKLY: { title: "This week in review", body: "What worked, what frictioned, and what’s next week’s focus?" },
    MONTHLY: { title: "Time for your monthly review", body: "Loved / stop / continue — then rate the six pillars." },
    QUARTERLY: { title: "Close this quarter", body: "Score your SMART goals, then sketch the next quarter." },
  },
};
