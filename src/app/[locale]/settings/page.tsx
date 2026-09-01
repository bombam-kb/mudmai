import { setRequestLocale } from "next-intl/server";
import { SettingsBoard } from "@/components/settings/settings-board";
import { requireAppUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PREFS, mergePrefs, toPrefDto } from "@/lib/reminders/schema";
import { ensureReferralCode } from "@/lib/referrals/code";
import { getReferralSummary } from "@/lib/referrals/service";
import { getLineLinkStatus } from "@/lib/line/account";
import { isLineLoginConfigured, isLineMessagingConfigured } from "@/lib/env";
import { toNudgeDto } from "@/lib/nudge/schema";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { error } = await searchParams;
  setRequestLocale(locale);
  const session = await requireAppUser(locale, { withReflection: true });

  if (session.demoMode) {
    return (
      <SettingsBoard
        name={session.name}
        demoMode
        initialPrefs={DEFAULT_PREFS}
        referral={null}
        line={null}
      />
    );
  }

  const [prefs, referralCode, referralSummary, lineStatus, nudges, unreadReminders] =
    await Promise.all([
      prisma.reminderPreference.findMany({ where: { userId: session.user.id } }).catch(() => []),
      ensureReferralCode(session.user.id).catch(() => null),
      getReferralSummary(session.user.id).catch(() => null),
      getLineLinkStatus(session.user.id).catch(() => null),
      prisma.aiNudgeLog
        .findMany({
          where: { userId: session.user.id, isRead: false },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
        .catch(() => []),
      prisma.reminderLog
        .count({ where: { userId: session.user.id, isRead: false } })
        .catch(() => 0),
    ]);

  let prefRows = prefs;
  if (lineStatus?.reminderOptIn) {
    const migrated = await prisma.reminderPreference
      .updateMany({
        where: { userId: session.user.id, enabled: true, channel: "IN_APP" },
        data: { channel: "LINE" },
      })
      .catch(() => ({ count: 0 }));
    if (migrated.count > 0) {
      prefRows = await prisma.reminderPreference
        .findMany({ where: { userId: session.user.id } })
        .catch(() => prefs);
    }
  }

  return (
    <SettingsBoard
      name={session.name}
      demoMode={false}
      initialPrefs={mergePrefs(prefRows.map(toPrefDto))}
      referral={
        referralCode && referralSummary ? { code: referralCode, ...referralSummary } : null
      }
      line={{
        linked: lineStatus?.linked ?? false,
        reachable: lineStatus?.reachable ?? false,
        reminderOptIn: lineStatus?.reminderOptIn ?? false,
        broadcastOptIn: lineStatus?.broadcastOptIn ?? false,
        canUnlink: lineStatus?.canUnlink ?? false,
        loginConfigured: isLineLoginConfigured(),
        messagingConfigured: isLineMessagingConfigured(),
        addFriendUrl: process.env.NEXT_PUBLIC_LINE_OA_BASIC_ID
          ? `https://line.me/R/ti/p/${process.env.NEXT_PUBLIC_LINE_OA_BASIC_ID}`
          : null,
      }}
      lineError={error}
      unreadReminders={unreadReminders}
      nudges={nudges.map(toNudgeDto)}
      reflection={
        session.reflection
          ? {
              healingThings: session.reflection.healingThings,
              happiestMoment: session.reflection.happiestMoment,
              expectationsNextYear: session.reflection.expectationsNextYear,
              lastYearStory: session.reflection.lastYearStory,
              ratings: {
                CAREER: session.reflection.ratingCareer,
                PERSONAL: session.reflection.ratingPersonal,
                FINANCE: session.reflection.ratingFinance,
                RELATIONSHIPS: session.reflection.ratingRelationships,
                MENTAL_HEALTH: session.reflection.ratingMental,
                PHYSICAL_HEALTH: session.reflection.ratingPhysical,
              },
            }
          : null
      }
    />
  );
}
