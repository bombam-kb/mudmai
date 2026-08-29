"use client";

import { useTranslations } from "next-intl";
import { PILLARS } from "@/lib/pillars";

type Props = {
  variant?: "dots" | "labeled";
  className?: string;
};

/** Compact six-dot key so pillar colors stay readable (Home CTAs, Settings, onboarding). */
export function PillarLegend({ variant = "dots", className }: Props) {
  const t = useTranslations("pillars");

  return (
    <ul
      className={
        variant === "labeled"
          ? `grid gap-2 sm:grid-cols-2 ${className ?? ""}`
          : `flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className ?? ""}`
      }
      aria-label={t("legendLabel")}
    >
      {PILLARS.map((pillar) => (
        <li key={pillar.id}>
          <span
            className="inline-flex items-center gap-1.5 text-sm text-ink"
            title={t(pillar.id)}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/5"
              style={{ backgroundColor: pillar.color }}
              aria-hidden
            />
            {variant === "labeled" ? (
              <span className="font-semibold">{t(pillar.id)}</span>
            ) : (
              <span className="sr-only">{t(pillar.id)}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
