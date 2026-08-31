import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { markLineReachable } from "@/lib/line/account";
import { oaKeyFromText, replyLine, welcomeMessages } from "@/lib/line/messaging";
import { buildOaDigest, digestMessages } from "@/lib/line/oa-digest";
import { attachUserMenu } from "@/lib/line/rich-menu";

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
      const linked = await prisma.lineAccount.findUnique({
        where: { lineUserId },
        include: { user: { select: { preferredLocale: true } } },
      });
      const locale = linked?.user.preferredLocale === "en" ? "en" : "th";
      if (event.replyToken) {
        await replyLine(event.replyToken, welcomeMessages(locale, Boolean(linked)));
      }
      void attachUserMenu(lineUserId, locale).catch(() => null);
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
    await replyLine(replyToken, welcomeMessages(locale, false));
    return;
  }
  const key = oaKeyFromText(data) ?? "home";
  const text = await buildOaDigest(account.userId, locale, key);
  await replyLine(replyToken, digestMessages(locale, text));
}
