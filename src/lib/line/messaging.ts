import { appPublicUrl, isLineMessagingConfigured } from "@/lib/env";
import { REMINDER_HREF, REMINDER_COPY } from "@/lib/reminders/copy";
import type { ReminderCadence } from "@prisma/client";

const PUSH_URL = "https://api.line.me/v2/bot/message/push";
const REPLY_URL = "https://api.line.me/v2/bot/message/reply";

function headers() {
  return {
    Authorization: `Bearer ${process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export const OA_PAGES = [
  { key: "today", path: "/todos", th: "วันนี้", en: "Today", color: "#2563EB" },
  { key: "goals", path: "/goals", th: "เป้า SMART", en: "Goals", color: "#8B5CF6" },
  { key: "reviews", path: "/reviews", th: "รีวิว", en: "Reviews", color: "#10B981" },
  { key: "home", path: "/home", th: "หน้าหลัก", en: "Home", color: "#06B6D4" },
] as const;

export type OaPageKey = (typeof OA_PAGES)[number]["key"];

export function lineAppHref(locale: "th" | "en", path: string) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${appPublicUrl()}/${locale}${suffix}`;
}

export function lineUriOk() {
  return appPublicUrl().startsWith("https://");
}

export type LinePushResult =
  | { ok: true }
  | { ok: false; unreachable?: boolean; status: number };

export async function pushLineText(lineUserId: string, messages: unknown[]): Promise<LinePushResult> {
  if (!isLineMessagingConfigured()) return { ok: false, status: 503 };
  const response = await fetch(PUSH_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ to: lineUserId, messages }),
  });
  if (response.ok) return { ok: true };
  const status = response.status;
  const unreachable = status === 400 || status === 403 || status === 404;
  return { ok: false, unreachable, status };
}

function fallbackText(messages: unknown[]) {
  const parts = messages.flatMap((message) => {
    if (!message || typeof message !== "object") return [];
    const row = message as { text?: unknown; altText?: unknown };
    if (typeof row.text === "string" && row.text.trim()) return [row.text];
    if (typeof row.altText === "string" && row.altText.trim()) return [row.altText];
    return [];
  });
  return parts.join("\n").slice(0, 5000) || "หมุดหมาย";
}

export async function replyLine(replyToken: string, messages: unknown[]) {
  if (!isLineMessagingConfigured() || messages.length === 0) return false;
  const send = (payload: unknown[]) =>
    fetch(REPLY_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ replyToken, messages: payload.slice(0, 5) }),
    });
  const response = await send(messages).catch(() => null);
  if (response?.ok) return true;
  const fallback = await send([{ type: "text", text: fallbackText(messages) }]).catch(() => null);
  if (!fallback?.ok) {
    console.warn("[line-reply]", response?.status ?? fallback?.status ?? "network");
  }
  return Boolean(fallback?.ok);
}

function pageLabel(locale: "th" | "en", page: (typeof OA_PAGES)[number]) {
  return locale === "en" ? page.en : page.th;
}

export function pagePostback(locale: "th" | "en", page: (typeof OA_PAGES)[number] | OaPageKey) {
  const item = typeof page === "string" ? OA_PAGES.find((row) => row.key === page) ?? OA_PAGES[3] : page;
  return {
    type: "postback" as const,
    label: pageLabel(locale, item),
    data: `mudmai:${item.key}`,
    displayText: pageLabel(locale, item),
  };
}

function uriOrPostback(locale: "th" | "en", page: (typeof OA_PAGES)[number]) {
  return pagePostback(locale, page);
}

function quickReply(locale: "th" | "en") {
  return {
    items: OA_PAGES.map((page) => ({
      type: "action",
      action: uriOrPostback(locale, page),
    })),
  };
}

export function oaMenuMessages(locale: "th" | "en", highlight?: OaPageKey) {
  const title = locale === "en" ? "Mudmai" : "หมุดหมาย";
  const subtitle =
    locale === "en" ? "Tap a page to open the app." : "กดปุ่มเพื่อเปิดแอปจาก LINE";
  const pages = highlight
    ? [...OA_PAGES].sort((a, b) => Number(b.key === highlight) - Number(a.key === highlight))
    : OA_PAGES;
  return [
    {
      type: "flex",
      altText: subtitle,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            { type: "text", text: title, weight: "bold", size: "xl", color: "#0f172a" },
            { type: "text", text: subtitle, size: "sm", color: "#64748b", wrap: true },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: pages.map((page) => ({
            type: "button",
            style: "primary",
            color: page.color,
            height: "sm",
            action: uriOrPostback(locale, page),
          })),
        },
      },
      quickReply: quickReply(locale),
    },
  ];
}

export function welcomeMessages(locale: "th" | "en", linked: boolean) {
  if (linked) return oaMenuMessages(locale);
  const title = locale === "en" ? "Mudmai" : "หมุดหมาย";
  const text =
    locale === "en"
      ? "Sign in once to connect this chat. After that, tap the menu to open Today, goals, and reviews."
      : "เข้าสู่ระบบครั้งเดียวเพื่อเชื่อมแชทนี้ แล้วกดเมนูด้านล่างหรือปุ่มด้านล่างข้อความเพื่อเปิดวันนี้ เป้า และรีวิว";
  const openLabel = locale === "en" ? "Sign in" : "เข้าสู่ระบบ";
  return [
    {
      type: "flex",
      altText: text,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            { type: "text", text: title, weight: "bold", size: "xl" },
            { type: "text", text, size: "sm", color: "#64748b", wrap: true },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#06C755",
              action: lineUriOk()
                ? { type: "uri", label: openLabel, uri: lineAppHref(locale, "/login") }
                : { type: "postback", label: openLabel, data: "mudmai:home", displayText: openLabel },
            },
            ...OA_PAGES.slice(0, 3).map((page) => ({
              type: "button",
              style: "secondary",
              height: "sm",
              action: uriOrPostback(locale, page),
            })),
          ],
        },
      },
      quickReply: quickReply(locale),
    },
  ];
}

export function reminderPushMessages(locale: "th" | "en", cadence: ReminderCadence) {
  const copy = REMINDER_COPY[locale][cadence];
  const open = locale === "en" ? "Open" : "เปิดแอป";
  const href = lineAppHref(locale, REMINDER_HREF[cadence]);
  const action = lineUriOk()
    ? { type: "uri" as const, label: open, uri: href }
    : { type: "postback" as const, label: open, data: "mudmai:today", displayText: open };
  return [
    {
      type: "flex",
      altText: `${copy.title} — ${copy.body}`,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            { type: "text", text: copy.title.slice(0, 40), weight: "bold", size: "lg", wrap: true },
            { type: "text", text: copy.body.slice(0, 80), size: "sm", color: "#64748b", wrap: true },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            { type: "button", style: "primary", color: "#7c3aed", action },
            ...OA_PAGES.filter((page) => page.path !== REMINDER_HREF[cadence])
              .slice(0, 2)
              .map((page) => ({
                type: "button",
                style: "secondary",
                height: "sm",
                action: uriOrPostback(locale, page),
              })),
          ],
        },
      },
      quickReply: quickReply(locale),
    },
  ];
}

export function linkPromptMessages(locale: "th" | "en") {
  return welcomeMessages(locale, false);
}

export function pathForOaKey(key: string | undefined) {
  const hit = OA_PAGES.find((page) => page.key === key);
  return hit?.path ?? "/home";
}

export function oaKeyFromText(data: string | undefined): OaPageKey | undefined {
  const key = (data ?? "").toLowerCase();
  if (key.includes("mudmai:")) {
    const slug = key.split("mudmai:")[1]?.split(/[\s&]/)[0] as OaPageKey | undefined;
    if (OA_PAGES.some((page) => page.key === slug)) return slug;
  }
  if (key.includes("goal") || key.includes("เป้า")) return "goals";
  if (key.includes("review") || key.includes("รีวิว")) return "reviews";
  if (key.includes("today") || key.includes("todo") || key.includes("วันนี้")) return "today";
  if (key.includes("home") || key.includes("หน้าหลัก") || key.includes("เมนู")) return "home";
  return undefined;
}
