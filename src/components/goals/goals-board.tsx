"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { MobileFold } from "@/components/mobile-fold";
import { GoalCard } from "@/components/goals/goal-card";
import { PILLARS, type PillarId } from "@/lib/pillars";
import { PillarIcon } from "@/components/icons";
import type { GoalDto } from "@/lib/goals/schema";
import type { MonthPlanDto } from "@/lib/month-plan/schema";
import { calendarParts, currentQuarter } from "@/lib/year";
import { useGoalsStore } from "@/stores/goals-store";
import { signOutClient } from "@/lib/auth/sign-out-client";
import { useRouter } from "@/i18n/navigation";
import { MonthPlanCard } from "@/components/month-plan/month-plan-card";

type Props = {
  name: string;
  year: number;
  demoMode: boolean;
  initialGoals: GoalDto[];
  month?: number;
  initialPlan?: MonthPlanDto | null;
};

export function GoalsBoard({
  name,
  year,
  demoMode,
  initialGoals,
  month,
  initialPlan = null,
}: Props) {
  const t = useTranslations("goals");
  const tp = useTranslations("pillars");
  const router = useRouter();
  const stored = useGoalsStore((state) => state.goals);
  const [quarter, setQuarter] = useState<number | 0>(currentQuarter());
  const [pillar, setPillar] = useState<PillarId | "ALL">("ALL");
  const [goals, setGoals] = useState(initialGoals);

  const source = demoMode ? stored.filter((goal) => goal.year === year) : goals;
  const planMonth = month ?? calendarParts().month;

  const visible = useMemo(
    () =>
      source.filter((goal) => {
        if (quarter !== 0 && goal.quarter !== quarter) return false;
        if (pillar !== "ALL" && goal.pillar !== pillar) return false;
        return true;
      }),
    [source, quarter, pillar],
  );

  const grouped = [1, 2, 3, 4].map((q) => ({
    quarter: q,
    goals: visible.filter((goal) => goal.quarter === q),
  }));

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  function onChange(next: GoalDto) {
    setGoals((current) =>
      current.map((goal) => (goal.id === next.id ? next : goal)),
    );
  }

  return (
    <AppShell name={name} onSignOut={signOut}>
      <div className="jr-page-head mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-personal">
            {t("eyebrow", { year })}
          </p>
          <h1 className="font-display text-4xl">{t("title")}</h1>
        </div>
        <Link
          href={`/goals/new?quarter=${quarter || currentQuarter()}`}
          className="rounded-full bg-brand px-5 py-2.5 font-semibold text-white shadow-card"
        >
          {t("create")}
        </Link>
      </div>

      {demoMode ? (
        <p className="mb-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("demo")}
        </p>
      ) : null}

      <div className="mb-6">
        <MonthPlanCard
          year={year}
          month={planMonth}
          demoMode={demoMode}
          initialPlan={initialPlan}
        />
      </div>

      <p className="mb-3 text-sm text-muted">{t("quarterHint")}</p>

      <div className="jr-chip-rail mb-4">
        <button
          type="button"
          onClick={() => setQuarter(0)}
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            quarter === 0 ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-slate-200"
          }`}
        >
          {t("allQuarters")}
        </button>
        {[1, 2, 3, 4].map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setQuarter(q)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              quarter === q ? "bg-brand text-white" : "bg-white text-muted ring-1 ring-slate-200"
            }`}
          >
            Q{q}
          </button>
        ))}
      </div>
      <div className="jr-chip-rail mb-6">
        <button
          type="button"
          onClick={() => setPillar("ALL")}
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            pillar === "ALL" ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-slate-200"
          }`}
        >
          {t("allPillars")}
        </button>
        {PILLARS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPillar(item.id)}
            className="rounded-full px-3 py-1 text-sm font-semibold text-white"
            style={{
              backgroundColor: item.color,
              opacity: pillar === "ALL" || pillar === item.id ? 1 : 0.35,
            }}
          >
            <span className="inline-flex items-center gap-1">
              <PillarIcon id={item.id} size={14} /> {tp(item.id)}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-card">
          <p className="text-lg text-muted">{t("empty")}</p>
        </div>
      ) : quarter === 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {grouped.map((group) => (
            <section key={group.quarter}>
              <MobileFold
                title={`Q${group.quarter}`}
                meta={
                  group.goals.length > 0 ? (
                    <span className="text-sm font-semibold text-muted">
                      {group.goals.length}
                    </span>
                  ) : null
                }
                defaultOpen={group.goals.length > 0 && group.quarter === currentQuarter()}
                preview={
                  group.goals.length === 0 ? (
                    <p className="text-sm text-muted">{t("emptyQuarter")}</p>
                  ) : (
                    <p className="text-sm text-muted">
                      {group.goals
                        .slice(0, 2)
                        .map((goal) => goal.title)
                        .join(" · ")}
                    </p>
                  )
                }
              >
                <div className="space-y-4">
                  {group.goals.length === 0 ? (
                    <p className="text-sm text-muted">{t("emptyQuarter")}</p>
                  ) : (
                    group.goals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        demoMode={demoMode}
                        onChange={onChange}
                      />
                    ))
                  )}
                </div>
              </MobileFold>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              demoMode={demoMode}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
