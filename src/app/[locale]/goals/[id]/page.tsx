import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { GoalForm } from "@/components/goals/goal-form";
import { GoalFormShell } from "@/components/goals/goal-form-shell";
import { GoalEditClient } from "@/components/goals/goal-edit-client";
import { requireAppUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { toGoalDto } from "@/lib/goals/schema";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditGoalPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requireAppUser(locale);

  if (session.demoMode) {
    return (
      <GoalFormShell demoMode titleKey="edit">
        <GoalEditClient id={id} demoMode />
      </GoalFormShell>
    );
  }

  const goal = await prisma.quarterlyGoal
    .findFirst({
      where: { id, userId: session.user.id },
      include: { milestones: { orderBy: { order: "asc" } } },
    })
    .catch(() => null);

  if (!goal) notFound();

  return (
    <GoalFormShell demoMode={false} titleKey="edit">
      <GoalForm demoMode={false} initial={toGoalDto(goal)} />
    </GoalFormShell>
  );
}
