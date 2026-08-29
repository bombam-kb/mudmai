"use client";

import { PillarIcon } from "@/components/icons";
import { ValenceOrb } from "@/components/mind/valence-orb";
import { PILLARS, type PillarId } from "@/lib/pillars";
import type { OnboardingRatings } from "@/lib/onboarding/schema";
import { useTranslations } from "next-intl";

type Props = {
  ratings: OnboardingRatings;
  onChange: (pillar: PillarId, value: number) => void;
  lastYear?: number;
  showIntro?: boolean;
};

export function ValencePicker({ ratings, onChange, lastYear, showIntro }: Props) {
  const t = useTranslations();

  return (
    <div>
      {showIntro ? (
        <>
          <p className="text-sm font-semibold uppercase tracking-wide text-personal">
            {t("onboarding.ratings.eyebrow")}
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">
            {t("onboarding.ratings.title", { lastYear: lastYear ?? "" })}
          </h1>
          <p className="mt-2 text-muted">{t("onboarding.ratings.hint")}</p>
        </>
      ) : null}
      <div className={`${showIntro ? "mt-6" : ""} grid gap-4`}>
        {PILLARS.map((pillar) => {
          const value = ratings[pillar.id];
          return (
            <div
              key={pillar.id}
              className="rounded-[1.75rem] bg-white p-4 shadow-card ring-1 ring-slate-100"
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="grid h-10 w-10 place-items-center rounded-2xl text-white"
                  style={{ backgroundColor: pillar.color }}
                >
                  <PillarIcon id={pillar.id} size={20} />
                </span>
                <p className="font-semibold text-ink">{t(`pillars.${pillar.id}`)}</p>
              </div>
              <div className="flex items-center gap-4">
                <ValenceOrb value={value || 3} size={52} />
                <div className="min-w-0 flex-1">
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={value || 3}
                    onPointerDown={() => {
                      if (!value) onChange(pillar.id, 3);
                    }}
                    onChange={(event) => onChange(pillar.id, Number(event.target.value))}
                    className="mind-slider w-full"
                    aria-label={t(`pillars.${pillar.id}`)}
                  />
                  <div className="mt-2 flex justify-between text-xs text-muted">
                    <span>{t("onboarding.ratings.low")}</span>
                    <span>{t("onboarding.ratings.high")}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
