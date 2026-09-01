"use client";

import { useRouter } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { TodayTodos } from "@/components/todos/today-todos";
import { MonthPlanCard } from "@/components/month-plan/month-plan-card";
import { VisionEntry } from "@/components/vision/vision-entry";
import { signOutClient } from "@/lib/auth/sign-out-client";
import { calendarParts } from "@/lib/year";
import { useTranslations } from "next-intl";
import type { GoalOption, TodoDto } from "@/lib/todos/schema";
import type { MoodLevel } from "@/lib/mood/schema";
import type { MonthPlanDto } from "@/lib/month-plan/schema";

type Props = {
  name: string;
  demoMode?: boolean;
  todos?: TodoDto[];
  goalOptions?: GoalOption[];
  mood?: MoodLevel | null;
  monthPlan?: MonthPlanDto | null;
};

export function HomeDashboard({
  name,
  demoMode,
  todos = [],
  goalOptions = [],
  mood = null,
  monthPlan = null,
}: Props) {
  const t = useTranslations("home");
  const router = useRouter();
  const parts = calendarParts();

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  return (
    <AppShell name={name} onSignOut={signOut}>
      <p className="jr-mobile-hello jr-mobile-only mb-4 font-display text-[1.75rem] leading-tight text-ink">
        {t("hello", { name })}
      </p>

      <div className="jr-home-focus">
        <TodayTodos
          demoMode={demoMode}
          initialTodos={todos}
          goals={goalOptions}
          initialMood={mood}
        />
        <MonthPlanCard
          year={parts.year}
          month={parts.month}
          demoMode={demoMode}
          initialPlan={monthPlan}
        />
      </div>
      <VisionEntry />
    </AppShell>
  );
}
