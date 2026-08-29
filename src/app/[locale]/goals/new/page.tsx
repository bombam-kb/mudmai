import { setRequestLocale } from "next-intl/server";
import { GoalForm } from "@/components/goals/goal-form";
import { GoalFormShell } from "@/components/goals/goal-form-shell";
import { requireAppUser } from "@/lib/auth/require-user";
import { currentQuarter } from "@/lib/year";
import type { PillarId } from "@/lib/pillars";
import { PILLARS } from "@/lib/pillars";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ quarter?: string; pillar?: string }>;
};

export const dynamic = "force-dynamic";

export default async function NewGoalPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const quarter = Number(query.quarter);
  const safeQuarter =
    Number.isInteger(quarter) && quarter >= 1 && quarter <= 4
      ? quarter
      : currentQuarter();
  const pillar = PILLARS.some((item) => item.id === query.pillar)
    ? (query.pillar as PillarId)
    : "PERSONAL";

  const session = await requireAppUser(locale);

  return (
    <GoalFormShell demoMode={session.demoMode} titleKey="create">
      <GoalForm demoMode={session.demoMode} quarter={safeQuarter} pillar={pillar} />
    </GoalFormShell>
  );
}
