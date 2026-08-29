import { setRequestLocale } from "next-intl/server";
import { ReminderInbox } from "@/components/reminders/inbox";
import { requireAppUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { toLogDto } from "@/lib/reminders/schema";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function RemindersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAppUser(locale);

  if (session.demoMode) {
    return (
      <ReminderInbox
        name={session.name}
        demoMode
        initialLogs={[]}
      />
    );
  }

  const logs = await prisma.reminderLog
    .findMany({
      where: { userId: session.user.id },
      orderBy: { sentAt: "desc" },
      take: 50,
    })
    .catch(() => []);

  return (
    <ReminderInbox name={session.name} demoMode={false} initialLogs={logs.map(toLogDto)} />
  );
}
