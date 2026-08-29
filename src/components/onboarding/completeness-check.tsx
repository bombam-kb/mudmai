"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PillarIcon } from "@/components/icons";
import { PillarBloom } from "@/components/mind/pillar-bloom";
import { PILLARS } from "@/lib/pillars";
import { analyzePillarCoverage } from "@/lib/onboarding/completeness";

type CheckField = "lastYearStory" | "expectationsNextYear";

type Props = {
  value: string;
  accent: string;
  field: CheckField;
};

export function CompletenessCheck({ value, accent, field }: Props) {
  const t = useTranslations("onboarding.check");
  const pillars = useTranslations("pillars");
  const [open, setOpen] = useState(false);
  const result = useMemo(
    () => (open ? analyzePillarCoverage(value) : null),
    [open, value],
  );

  function sentenceTone(percent: number) {
    if (percent >= 90) return t("sentenceGreat");
    if (percent >= 70) return t("sentenceGood");
    if (percent >= 40) return t("sentenceOk");
    return t("sentenceLow");
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-slate-200"
        >
          {t("cta")}
        </button>
        <p className="text-xs text-muted">{t("optional")}</p>
      </div>

      {open && !result ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("empty")}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-4 rounded-[1.75rem] bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>
                {t(`resultTitle.${field}`)}
              </p>
              <p className="mt-1 font-display text-2xl text-ink">
                {t("coverage", {
                  covered: result.covered.length,
                  total: PILLARS.length,
                })}
              </p>
            </div>
            <div className="rounded-3xl bg-white p-2 shadow-card ring-1 ring-slate-100">
              <PillarBloom covered={result.covered} />
            </div>
            <div className="rounded-3xl bg-white px-4 py-3 text-center shadow-card ring-1 ring-slate-100">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t("sentenceLabel")}
              </p>
              <p className="font-display text-3xl text-ink">{result.sentencePercent}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PILLARS.map((pillar) => {
              const ok = result.covered.includes(pillar.id);
              return (
                <div
                  key={pillar.id}
                  className={`rounded-2xl px-3 py-2 text-sm ${
                    ok ? "bg-white text-ink" : "bg-white/60 text-muted"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {ok ? (
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                        ✓
                      </span>
                    ) : (
                      <span className="inline-block h-4 w-4 rounded-full ring-1 ring-slate-300" />
                    )}
                    <PillarIcon id={pillar.id} size={16} />
                    {pillars(pillar.id)}
                  </span>
                </div>
              );
            })}
          </div>

          {result.missing.length > 0 ? (
            <div>
              <p className="text-sm font-semibold text-ink">{t("missingTitle")}</p>
              <ul className="mt-2 space-y-2">
                {result.missing.map((id) => (
                  <li
                    key={id}
                    className="rounded-2xl bg-white px-3 py-2 text-sm leading-relaxed text-ink"
                  >
                    <span className="mb-1 inline-flex text-ink">
                      <PillarIcon id={id} size={16} />
                    </span>{" "}
                    {t(`suggest.${field}.${id}`)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {t("allCovered")}
            </p>
          )}

          <p className="text-sm text-muted">{sentenceTone(result.sentencePercent)}</p>
        </div>
      ) : null}
    </div>
  );
}
