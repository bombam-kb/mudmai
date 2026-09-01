"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { isSupabaseConfigured } from "@/lib/env";
import { localYmd, shiftYmd } from "@/lib/year";
import { useNudgeStore } from "@/stores/nudge-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useReviewsStore } from "@/stores/reviews-store";
import { useTodosStore } from "@/stores/todos-store";

let nudgeEvalScheduled = false;

/** Generate nudges in the background so they appear in More, not on Home. */
export function NudgeWatcher() {
  const locale = useLocale() === "en" ? "en" : "th";
  const storeHealing = useOnboardingStore((state) => state.healingThings);
  const storeHappiest = useOnboardingStore((state) => state.happiestMoment);
  const storeExpect = useOnboardingStore((state) => state.expectationsNextYear);
  const monthly = useReviewsStore((state) => state.monthly);
  const todos = useTodosStore((state) => state.todos);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      if (nudgeEvalScheduled) return;
      const timer = window.setTimeout(() => {
        nudgeEvalScheduled = true;
        void fetch("/api/nudges", { method: "POST" }).catch(() => null);
      }, 2500);
      return () => window.clearTimeout(timer);
    }

    const today = localYmd();
    const weekFrom = shiftYmd(today, -6);
    const latest = [...monthly].sort(
      (a, b) => b.year - a.year || b.month - a.month,
    )[0];
    useNudgeStore.getState().evaluateDemo({
      locale,
      reflection:
        storeHealing || storeExpect
          ? {
              healingThings: storeHealing,
              happiestMoment: storeHappiest,
              expectationsNextYear: storeExpect,
            }
          : null,
      monthly: latest
        ? { year: latest.year, month: latest.month, ratings: latest.ratings }
        : null,
      weekTodos: todos.filter((todo) => todo.date >= weekFrom && todo.date <= today),
      weekFrom,
      weekTo: today,
    });
  }, [locale, monthly, storeExpect, storeHappiest, storeHealing, todos]);

  return null;
}
