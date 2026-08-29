import { setRequestLocale } from "next-intl/server";
import { VisionBoard } from "@/components/vision/vision-board";
import { requireAppUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { activeCalendarYear } from "@/lib/year";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function VisionPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const year = activeCalendarYear();
  const session = await requireAppUser(locale);

  if (session.demoMode) {
    return <VisionBoard year={year} initialSnapshot={null} demoMode />;
  }

  const canvas = await prisma.visionCanvas
    .findUnique({
      where: { userId_year: { userId: session.user.id, year } },
    })
    .catch(() => null);

  return (
    <VisionBoard
      year={year}
      initialSnapshot={canvas?.canvasJson ?? null}
      demoMode={false}
    />
  );
}
