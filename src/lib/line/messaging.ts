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

export function lineAppHref(locale: "th" | "en", path: string) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${appPublicUrl()}/${locale}${suffix}`;
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

export async function replyLine(replyToken: string, messages: unknown[]) {
  if (!isLineMessagingConfigured()) return;
  await fetch(REPLY_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ replyToken, messages }),
  }).catch(() => null);
}

export function reminderPushMessages(
  locale: "th" | "en",
  cadence: ReminderCadence,
) {
  const copy = REMINDER_COPY[locale][cadence];
  const label = locale === "en" ? "Open" : "เปิด";
  return [
    {
      type: "template",
      altText: `${copy.title} — ${copy.body}`,
      template: {
        type: "buttons",
        title: copy.title.slice(0, 40),
        text: copy.body.slice(0, 60),
        actions: [
          {
            type: "uri",
            label,
            uri: lineAppHref(locale, REMINDER_HREF[cadence]),
          },
        ],
      },
    },
  ];
}

export function linkPromptMessages(locale: "th" | "en") {
  const login = lineAppHref(locale, "/login");
  if (locale === "en") {
    return [
      {
        type: "template",
        altText: "Open Mudmai to connect this LINE account.",
        template: {
          type: "buttons",
          title: "Mudmai",
          text: "Sign in on the web to connect this chat for private reminders.",
          actions: [{ type: "uri", label: "Open app", uri: login }],
        },
      },
    ];
  }
  return [
    {
      type: "template",
      altText: "เปิดหมุดหมายเพื่อเชื่อมบัญชี LINE",
      template: {
        type: "buttons",
        title: "หมุดหมาย",
        text: "เข้าสู่ระบบบนเว็บเพื่อเชื่อมแชทนี้สำหรับการเตือนส่วนตัว",
        actions: [{ type: "uri", label: "เปิดแอป", uri: login }],
      },
    },
  ];
}
