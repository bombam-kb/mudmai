import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { markLineReachable } from "@/lib/line/account";
import { linkPromptMessages, lineAppHref, replyLine } from "@/lib/line/messaging";

type LineEvent = {
  type?: string;
  webhookEventId?: string;
  replyToken?: string;
  source?: { userId?: string; type?: string };
  postback?: { data?: string };
  message?: { type?: string; text?: string };
};

export async function isDuplicateWebhookEvent(id: string | undefined) {
  if (!id) return false;
  try {
    await prisma.lineWebhookEvent.create({ data: { id } });
    return false;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return true;
    }
    return false;
  }
}

export async function handleLineEvents(events: LineEvent[]) {
  for (const event of events) {
    const duplicate = await isDuplicateWebhookEvent(event.webhookEventId);
    if (duplicate) continue;
    const lineUserId = event.source?.userId;
    if (!lineUserId) continue;

    if (event.type === "follow") {
      await markLineReachable(lineUserId, true);
      const linked = await prisma.lineAccount.findUnique({ where: { lineUserId } });
      if (!linked && event.replyToken) {
        await replyLine(event.replyToken, linkPromptMessages("th"));
      }
      continue;
    }

    if (event.type === "unfollow") {
      await markLineReachable(lineUserId, false);
      continue;
    }

    if (event.type === "postback" || event.type === "message") {
      await replyForShortcut(event.replyToken, lineUserId, event.postback?.data ?? event.message?.text);
    }
  }
}

async function replyForShortcut(
  replyToken: string | undefined,
  lineUserId: string,
  data: string | undefined,
) {
  if (!replyToken) return;
  const account = await prisma.lineAccount.findUnique({
    where: { lineUserId },
    include: { user: { select: { preferredLocale: true } } },
  });
  const locale = account?.user.preferredLocale === "en" ? "en" : "th";
  if (!account) {
    await replyLine(replyToken, linkPromptMessages(locale));
    return;
  }

  const key = (data ?? "").toLowerCase();
  const path =
    key.includes("goal") || key.includes("เป้า")
      ? "/goals"
      : key.includes("review") || key.includes("รีวิว")
        ? "/reviews"
        : key.includes("today") || key.includes("todo") || key.includes("วันนี้")
          ? "/todos"
          : "/home";
  const label = locale === "en" ? "Open" : "เปิด";
  const title = locale === "en" ? "Mudmai" : "หมุดหมาย";
  const text =
    locale === "en"
      ? "Open the app to continue. Private reminders stay in this chat when you opt in."
      : "เปิดแอปเพื่อทำต่อ การเตือนส่วนตัวจะมาในแชทนี้ถ้าคุณเปิดไว้";

  await replyLine(replyToken, [
    {
      type: "template",
      altText: title,
      template: {
        type: "buttons",
        title,
        text,
        actions: [{ type: "uri", label, uri: lineAppHref(locale, path) }],
      },
    },
  ]);
}
