"use client";

import { useLocale, useTranslations } from "next-intl";
import { PILLARS } from "@/lib/pillars";
import { PillarIcon } from "@/components/icons";
import type { OnboardingRatings } from "@/lib/onboarding/schema";

type Props = {
  ratings?: OnboardingRatings | null;
};

export function PillarHighlight({ ratings }: Props) {
  const t = useTranslations("pillars");
  const locale = useLocale();

  return (
    <section id="pillars" className="jr-pillar-highlight scroll-mt-24">
      <p className="jr-pillar-eyebrow text-sm font-semibold uppercase tracking-wide text-personal">
        {t("highlightEyebrow")}
      </p>
      <h2 className="mt-2 font-display text-4xl">{t("highlightTitle")}</h2>
      <p className="jr-pillar-lede mt-3 max-w-2xl text-muted">{t("highlightBody")}</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map((pillar) => {
          const score = ratings?.[pillar.id];
          return (
            <li
              key={pillar.id}
              className="rounded-[1.75rem] bg-white/90 p-5 shadow-card ring-1 ring-white"
              style={{ borderTop: `5px solid ${pillar.color}` }}
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-2xl text-white"
                style={{ backgroundColor: pillar.color }}
              >
                <PillarIcon id={pillar.id} size={22} />
              </span>
              <p className="mt-3 font-display text-xl text-ink">{t(pillar.id)}</p>
              <p className="jr-pillar-en text-xs font-semibold uppercase tracking-wide text-muted">
                {locale === "th" ? pillar.labelEn : pillar.labelTh}
              </p>
              <p className="jr-pillar-blurb mt-2 text-sm text-muted">{t(`blurb.${pillar.id}`)}</p>
              {typeof score === "number" && score > 0 ? (
                <ScoreBar value={score} color={pillar.color} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ScoreBar({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  const t = useTranslations("pillars");
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-xs font-semibold">
        <span className="text-muted">{t("yourScore")}</span>
        <span className="text-ink">{value}/5</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
