"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AiLabel, AiSparkle } from "@/components/icons";
import { hrefForNudge, type NudgeDto, type NudgeReflection, type NudgeTriggerId } from "@/lib/nudge/schema";
import { PILLAR_MAP } from "@/lib/pillars";
import { useNudgeStore } from "@/stores/nudge-store";
import type { OnboardingRatings } from "@/lib/onboarding/schema";
import { localYmd, shiftYmd } from "@/lib/year";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useReviewsStore } from "@/stores/reviews-store";
import { useTodosStore } from "@/stores/todos-store";

let nudgeEvalScheduled = false;

function sparkleToColor(trigger: NudgeTriggerId) {
  if (trigger === "LOW_MENTAL_SCORE") return PILLAR_MAP.MENTAL_HEALTH.color;
  if (trigger === "LOW_CAREER_SCORE") return PILLAR_MAP.CAREER.color;
  return PILLAR_MAP.PERSONAL.color;
}

type Props = {
  demoMode?: boolean;
  initialNudges?: NudgeDto[];
  reflection?: (NudgeReflection & { ratings?: OnboardingRatings }) | null;
};

export function NudgeCards({ demoMode, initialNudges = [], reflection }: Props) {
  const t = useTranslations("nudge");
  const locale = useLocale() === "en" ? "en" : "th";
  const stored = useNudgeStore((state) => state.nudges);
  const [live, setLive] = useState(initialNudges);
  const storeHealing = useOnboardingStore((state) => state.healingThings);
  const storeHappiest = useOnboardingStore((state) => state.happiestMoment);
  const storeExpect = useOnboardingStore((state) => state.expectationsNextYear);
  const monthly = useReviewsStore((state) => state.monthly);
  const todos = useTodosStore((state) => state.todos);

  useEffect(() => {
    setLive(initialNudges);
  }, [initialNudges]);

  useEffect(() => {
    if (demoMode || nudgeEvalScheduled) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      nudgeEvalScheduled = true;
      void fetch("/api/nudges", { method: "POST" })
        .then((response) => (response.ok ? response.json() : null))
        .then((json: { nudges?: NudgeDto[] } | null) => {
          if (!cancelled && json?.nudges) setLive(json.nudges);
        })
        .catch(() => null);
    }, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [demoMode]);

  useEffect(() => {
    if (!demoMode) return;
    const today = localYmd();
    const weekFrom = shiftYmd(today, -6);
    const latest = [...monthly].sort(
      (a, b) => b.year - a.year || b.month - a.month,
    )[0];
    useNudgeStore.getState().evaluateDemo({
      locale,
      reflection: reflection
        ? {
            healingThings: reflection.healingThings,
            happiestMoment: reflection.happiestMoment,
            expectationsNextYear: reflection.expectationsNextYear,
          }
        : storeHealing || storeExpect
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
  }, [
    demoMode,
    locale,
    monthly,
    reflection,
    storeExpect,
    storeHappiest,
    storeHealing,
    todos,
  ]);

  const unread = (demoMode ? stored : live).filter((item) => !item.isRead).slice(0, 3);

  async function dismiss(id: string) {
    if (demoMode) {
      useNudgeStore.getState().markRead(id);
      return;
    }
    await fetch(`/api/nudges/${id}`, { method: "PATCH" });
    setLive((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
  }

  return (
    <section className="min-w-0 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-6 text-white shadow-card">
      <h2 className="font-display text-2xl">
        <AiLabel painted={false} size={22}>
          {t("title")}
        </AiLabel>
      </h2>
      {unread.length === 0 ? (
        <p className="mt-2 text-white/90">{t("empty")}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {unread.map((nudge) => (
            <li key={nudge.id} className="rounded-2xl bg-white/15 p-3 backdrop-blur">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/80">
                <AiSparkle size={12} painted toColor={sparkleToColor(nudge.triggerReason)} />
                {t(`trigger.${nudge.triggerReason}`)}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white">{nudge.nudgeText}</p>
              <div className="mt-3 flex gap-2">
                <Link
                  href={hrefForNudge(nudge.triggerReason)}
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand"
                >
                  {t("open")}
                </Link>
                <button
                  type="button"
                  onClick={() => void dismiss(nudge.id)}
                  className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold"
                >
                  {t("dismiss")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
