"use client";

import { useLocale, useTranslations } from "next-intl";
import { PILLARS } from "@/lib/pillars";
import { PillarIcon } from "@/components/icons";

export function PillarStrip() {
  const t = useTranslations("pillars");
  const locale = useLocale();

  return (
    <div className="jr-rail jr-pillar-rail">
      {PILLARS.map((pillar) => (
        <div
          key={pillar.id}
          className="rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-100"
          style={{ borderTop: `4px solid ${pillar.color}` }}
        >
          <span
            className="grid h-9 w-9 place-items-center rounded-xl text-white"
            style={{ backgroundColor: pillar.color }}
          >
            <PillarIcon id={pillar.id} size={18} />
          </span>
          <p className="mt-2 text-sm font-semibold text-ink">{t(pillar.id)}</p>
          <p className="text-xs text-muted">
            {locale === "th" ? pillar.labelEn : pillar.labelTh}
          </p>
        </div>
      ))}
    </div>
  );
}
