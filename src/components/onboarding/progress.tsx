"use client";

import { TOTAL_STEPS } from "@/stores/onboarding-store";
import { useTranslations } from "next-intl";

export function OnboardingProgress({ step }: { step: number }) {
  const t = useTranslations("onboarding");
  const current = Math.min(step + 1, TOTAL_STEPS);
  const percent = (current / TOTAL_STEPS) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm font-semibold text-muted">
        <span>{t("progress", { current, total: TOTAL_STEPS })}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/80 ring-1 ring-violet-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-personal via-brand to-relationships transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
