import { prisma } from "@/lib/prisma";
import { PDPA_VERSION } from "@/lib/pdpa";
import { applyReferral } from "@/lib/referrals/service";
import { DEFAULT_PREFS } from "@/lib/reminders/schema";
import { isLinePlaceholderEmail } from "@/lib/line/oauth";
import { attachUserMenu } from "@/lib/line/rich-menu";
import type { Locale } from "@prisma/client";

export type LineLinkStatus = {
  linked: boolean;
  reachable: boolean;
  reminderOptIn: boolean;
  broadcastOptIn: boolean;
  canUnlink: boolean;
};

export async function getLineLinkStatus(userId: string): Promise<LineLinkStatus> {
  const [account, user] = await Promise.all([
    prisma.lineAccount.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
  ]);
  return {
    linked: Boolean(account),
    reachable: Boolean(account?.reachable),
    reminderOptIn: account?.reminderOptIn ?? false,
    broadcastOptIn: account?.broadcastOptIn ?? false,
    canUnlink: Boolean(account) && !isLinePlaceholderEmail(user?.email),
  };
}

export async function markLineReachable(lineUserId: string, reachable: boolean) {
  const now = new Date();
  await prisma.lineAccount.updateMany({
    where: { lineUserId },
    data: reachable
      ? { reachable: true, friendAt: now, unfollowedAt: null }
      : { reachable: false, unfollowedAt: now },
  });
}

export async function unlinkLineAccount(userId: string) {
  const deleted = await prisma.lineAccount.deleteMany({ where: { userId } });
  return deleted.count;
}

export async function upsertLineAccount(input: {
  userId: string;
  lineUserId: string;
  reachable: boolean;
}) {
  const now = new Date();
  const row = await prisma.lineAccount.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      lineUserId: input.lineUserId,
      reachable: input.reachable,
      reminderOptIn: true,
      broadcastOptIn: false,
      friendAt: input.reachable ? now : null,
    },
    update: {
      lineUserId: input.lineUserId,
      reachable: input.reachable,
      friendAt: input.reachable ? now : undefined,
      unfollowedAt: input.reachable ? null : undefined,
    },
  });
  void attachUserMenu(input.lineUserId).catch(() => null);
  return row;
}

export async function ensureLineUserProfile(input: {
  authUserId: string;
  email: string;
  locale: Locale;
  pdpa: boolean;
  referralCode?: string;
}) {
  const name = input.locale === "en" ? "Traveler" : "นักเดินทาง";
  const existing = await prisma.user.findUnique({ where: { id: input.authUserId } });
  if (existing) return existing;

  const created = await prisma.user.create({
    data: {
      id: input.authUserId,
      email: input.email,
      name,
      preferredLocale: input.locale,
      pdpaConsentAt: input.pdpa ? new Date() : null,
      pdpaConsentVersion: input.pdpa ? PDPA_VERSION : null,
      reminderPrefs: {
        create: DEFAULT_PREFS.map((pref) => ({
          cadence: pref.cadence,
          enabled: pref.enabled,
          hour: pref.hour,
          minute: pref.minute,
          weekday: pref.weekday,
          channel: pref.channel,
        })),
      },
    },
  });

  if (input.referralCode) {
    await applyReferral({
      code: input.referralCode,
      referredUserId: created.id,
      referredEmail: created.email,
    }).catch(() => null);
  }

  return created;
}
