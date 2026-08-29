"use client";

import { GoalForm } from "@/components/goals/goal-form";
import { useGoalsStore } from "@/stores/goals-store";
import { useTranslations } from "next-intl";

export function GoalEditClient({ id, demoMode }: { id: string; demoMode: boolean }) {
  const t = useTranslations("goals");
  const goal = useGoalsStore((state) => state.goals.find((item) => item.id === id));

  if (!goal) {
    return <p className="text-muted">{t("notFound")}</p>;
  }

  return <GoalForm demoMode={demoMode} initial={goal} />;
}
