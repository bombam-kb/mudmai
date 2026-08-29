"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { RatingsPicker } from "@/components/reviews/ratings-picker";
import { Link, useRouter } from "@/i18n/navigation";
import { signOutClient } from "@/lib/auth/sign-out-client";
import type { GoalDto } from "@/lib/goals/schema";
import type { OnboardingRatings } from "@/lib/onboarding/schema";
import type { PillarId } from "@/lib/pillars";
import { PillarIcon } from "@/components/icons";
import {
  emptyQuarterly,
  type GoalOutcome,
  type QuarterlyReviewDto,
  type QuarterlyReviewInput,
} from "@/lib/reviews/schema";
import { useReviewsStore } from "@/stores/reviews-store";
import { useGoalsStore } from "@/stores/goals-store";

type Props = {
  name: string;
  demoMode: boolean;
  year: number;
  quarter: number;
  initial: QuarterlyReviewDto | null;
  goals: GoalDto[];
};

export function QuarterlyReviewForm({
  name,
  demoMode,
  year,
  quarter,
  initial,
  goals,
}: Props) {
  const t = useTranslations("reviews");
  const tg = useTranslations("goals");
  const router = useRouter();
  const storedGoals = useGoalsStore((state) => state.goals);
  const liveGoals = demoMode
    ? storedGoals.filter((goal) => goal.year === year && goal.quarter === quarter)
    : goals;
  const starting: QuarterlyReviewInput = initial ?? {
    ...emptyQuarterly(year, quarter),
    goalOutcomes: liveGoals.map(goalToOutcome),
  };
  const [form, setForm] = useState<QuarterlyReviewInput>({
    ...starting,
    goalOutcomes: mergeOutcomes(starting.goalOutcomes, liveGoals),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  async function save() {
    setSaving(true);
    setError(false);
    try {
      const payload = {
        ...form,
        goalOutcomes: mergeOutcomes(form.goalOutcomes, liveGoals),
      };
      if (demoMode) {
        useReviewsStore.getState().upsertQuarterly({
          ...payload,
          id: initial?.id ?? crypto.randomUUID(),
        });
        router.push("/reviews");
        return;
      }
      const response = await fetch("/api/reviews/quarterly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { ok: boolean };
      if (!json.ok) throw new Error("save");
      router.push("/reviews");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  function setRating(pillar: PillarId, value: number) {
    setForm((current) => ({
      ...current,
      ratings: { ...current.ratings, [pillar]: value } as OnboardingRatings,
    }));
  }

  function setNote(goalId: string, note: string) {
    setForm((current) => ({
      ...current,
      goalOutcomes: current.goalOutcomes.map((item) =>
        item.goalId === goalId ? { ...item, note } : item,
      ),
    }));
  }

  return (
    <AppShell name={name} onSignOut={signOut}>
      <Link href="/reviews" className="text-sm font-semibold text-brand">
        ← {t("back")}
      </Link>
      <h1 className="mt-2 font-display text-4xl">
        {t("quarterlyTitle", { quarter, year })}
      </h1>
      <p className="mt-2 text-muted">{t("quarterlyHint")}</p>

      {demoMode ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("demo")}
        </p>
      ) : null}

      <section className="mt-6 rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100">
        <h2 className="font-display text-2xl">{t("scorecard")}</h2>
        {liveGoals.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t("noGoals")}</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {mergeOutcomes(form.goalOutcomes, liveGoals).map((goal) => (
              <li key={goal.goalId} className="rounded-2xl bg-slate-50 p-3">
                <div className="flex justify-between gap-2 text-sm font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <PillarIcon id={goal.pillar} size={16} /> {goal.title}
                  </span>
                  <span className="text-muted">
                    {Math.round(goal.progress)}% · {tg(`statuses.${goal.status}`)}
                  </span>
                </div>
                <textarea
                  value={goal.note}
                  onChange={(event) => setNote(goal.goalId, event.target.value)}
                  placeholder={t("goalNote")}
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4 grid gap-4">
        <label className="block rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100">
          <span className="font-semibold">{t("narrative")}</span>
          <textarea
            value={form.narrative}
            onChange={(event) =>
              setForm((current) => ({ ...current, narrative: event.target.value }))
            }
            rows={4}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
          />
        </label>
        <label className="block rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100">
          <span className="font-semibold">{t("nextPlan")}</span>
          <textarea
            value={form.nextQuarterPlan}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                nextQuarterPlan: event.target.value,
              }))
            }
            rows={4}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
          />
        </label>
        <div>
          <h2 className="mb-3 font-display text-2xl">{t("ratings")}</h2>
          <RatingsPicker ratings={form.ratings} onChange={setRating} />
        </div>
        {error ? <p className="text-sm text-red-600">{t("error")}</p> : null}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-full bg-brand px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>
    </AppShell>
  );
}

function goalToOutcome(goal: GoalDto): GoalOutcome {
  return {
    goalId: goal.id,
    title: goal.title,
    pillar: goal.pillar,
    progress: goal.progress,
    status: goal.status,
    note: "",
  };
}

function mergeOutcomes(saved: GoalOutcome[], goals: GoalDto[]): GoalOutcome[] {
  if (goals.length === 0) return saved;
  return goals.map((goal) => {
    const note = saved.find((item) => item.goalId === goal.id)?.note ?? "";
    return { ...goalToOutcome(goal), note };
  });
}
