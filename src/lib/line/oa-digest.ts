import { prisma } from "@/lib/prisma";
import { lineAppHref, lineUriOk, OA_PAGES, pagePostback, type OaPageKey } from "@/lib/line/messaging";
import { goalProgressPercent } from "@/lib/pillars";
import { activeCalendarYear, calendarParts, currentQuarter, fromDateOnly, localYmd } from "@/lib/year";

const MAX_LINES = 10;

export function digestMessages(locale: "th" | "en", text: string) {
  return [
    {
      type: "text" as const,
      text: text.slice(0, 5000),
      quickReply: {
        items: OA_PAGES.map((page) => ({
          type: "action",
          action: pagePostback(locale, page.key),
        })),
      },
    },
  ];
}

function withOpenLink(locale: "th" | "en", text: string, path: string) {
  if (!lineUriOk()) return text;
  const label = locale === "en" ? "Open in app" : "เปิดในแอป";
  return `${text}\n\n${label}\n${lineAppHref(locale, path)}`;
}

export function formatTodoDigest(
  locale: "th" | "en",
  ymd: string,
  todos: Array<{ title: string; isCompleted: boolean }>,
) {
  if (todos.length === 0) {
    return locale === "en"
      ? `Today · ${ymd}\nNo tasks yet. Add them in Mudmai.`
      : `วันนี้ · ${ymd}\nยังไม่มีงาน เพิ่มได้ในแอปหมุดหมาย`;
  }
  const done = todos.filter((todo) => todo.isCompleted).length;
  const header =
    locale === "en" ? `Today · ${ymd}\n${done}/${todos.length} done` : `วันนี้ · ${ymd}\n${done}/${todos.length} งาน`;
  const lines = todos
    .slice(0, MAX_LINES)
    .map((todo) => `${todo.isCompleted ? "✓" : "○"} ${todo.title.slice(0, 60)}`);
  const more =
    todos.length > MAX_LINES
      ? locale === "en"
        ? `\n+${todos.length - MAX_LINES} more`
        : `\nอีก ${todos.length - MAX_LINES} รายการ`
      : "";
  return `${header}\n\n${lines.join("\n")}${more}`;
}

export function formatGoalDigest(
  locale: "th" | "en",
  year: number,
  goals: Array<{ title: string; quarter: number; currentValue: number; targetValue: number; status: string }>,
) {
  if (goals.length === 0) {
    return locale === "en"
      ? `SMART goals ${year}\nNone yet. Add them in Mudmai.`
      : `เป้า SMART ${year}\nยังไม่มีเป้า เพิ่มได้ในแอปหมุดหมาย`;
  }
  const lines = goals.slice(0, MAX_LINES).map((goal) => {
    const pct = Math.round(goalProgressPercent(goal.currentValue, goal.targetValue));
    return `Q${goal.quarter} · ${goal.title.slice(0, 40)} · ${pct}%`;
  });
  const header = locale === "en" ? `SMART goals ${year}` : `เป้า SMART ${year}`;
  return `${header}\n${lines.join("\n")}`;
}

export function formatReviewDigest(
  locale: "th" | "en",
  year: number,
  month: number,
  quarter: number,
  monthlyDone: boolean,
  quarterlyDone: boolean,
) {
  const header = locale === "en" ? `Reviews ${year}` : `รีวิว ${year}`;
  const monthLine =
    locale === "en"
      ? `Month ${month}: ${monthlyDone ? "saved" : "not yet"}`
      : `เดือน ${month}: ${monthlyDone ? "บันทึกแล้ว" : "ยังไม่มี"}`;
  const quarterLine =
    locale === "en"
      ? `Quarter ${quarter}: ${quarterlyDone ? "saved" : "not yet"}`
      : `ไตรมาส ${quarter}: ${quarterlyDone ? "บันทึกแล้ว" : "ยังไม่มี"}`;
  return `${header}\n${monthLine}\n${quarterLine}`;
}

export function formatHomeDigest(
  locale: "th" | "en",
  ymd: string,
  todoDone: number,
  todoTotal: number,
  goalCount: number,
  mood: number | null,
) {
  const header = locale === "en" ? "Mudmai" : "หมุดหมาย";
  const todos =
    locale === "en" ? `Today ${todoDone}/${todoTotal} tasks` : `วันนี้ ${todoDone}/${todoTotal} งาน`;
  const goals = locale === "en" ? `Goals this year: ${goalCount}` : `เป้าปีนี้ ${goalCount} รายการ`;
  const moodLine =
    mood == null
      ? locale === "en"
        ? "Mood not set today"
        : "ยังไม่บันทึกอารมณ์วันนี้"
      : locale === "en"
        ? `Mood today ${mood}/5`
        : `อารมณ์วันนี้ ${mood}/5`;
  return `${header} · ${ymd}\n${todos}\n${goals}\n${moodLine}`;
}

export async function buildOaDigest(userId: string, locale: "th" | "en", key: OaPageKey) {
  const today = localYmd();
  const year = activeCalendarYear();
  const parts = calendarParts();
  const quarter = currentQuarter();
  const page = OA_PAGES.find((item) => item.key === key) ?? OA_PAGES[3];

  if (key === "today") {
    const todos = await prisma.dailyTodo.findMany({
      where: { userId, date: fromDateOnly(today) },
      orderBy: { createdAt: "asc" },
      select: { title: true, isCompleted: true },
    });
    return withOpenLink(locale, formatTodoDigest(locale, today, todos), page.path);
  }

  if (key === "goals") {
    const goals = await prisma.quarterlyGoal.findMany({
      where: { userId, year },
      orderBy: [{ quarter: "asc" }, { createdAt: "asc" }],
      select: {
        title: true,
        quarter: true,
        currentValue: true,
        targetValue: true,
        status: true,
      },
    });
    return withOpenLink(locale, formatGoalDigest(locale, year, goals), page.path);
  }

  if (key === "reviews") {
    const [monthly, quarterly] = await Promise.all([
      prisma.monthlyReview.findUnique({
        where: { userId_year_month: { userId, year, month: parts.month } },
        select: { id: true },
      }),
      prisma.quarterlyReview.findUnique({
        where: { userId_year_quarter: { userId, year, quarter } },
        select: { id: true },
      }),
    ]);
    return withOpenLink(
      locale,
      formatReviewDigest(locale, year, parts.month, quarter, Boolean(monthly), Boolean(quarterly)),
      page.path,
    );
  }

  const [todos, goalCount, mood] = await Promise.all([
    prisma.dailyTodo.findMany({
      where: { userId, date: fromDateOnly(today) },
      select: { isCompleted: true },
    }),
    prisma.quarterlyGoal.count({ where: { userId, year } }),
    prisma.dailyMood.findUnique({
      where: { userId_date: { userId, date: fromDateOnly(today) } },
      select: { level: true },
    }),
  ]);
  return withOpenLink(
    locale,
    formatHomeDigest(
      locale,
      today,
      todos.filter((todo) => todo.isCompleted).length,
      todos.length,
      goalCount,
      mood?.level ?? null,
    ),
    page.path,
  );
}
