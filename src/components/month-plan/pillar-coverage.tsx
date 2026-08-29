"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { PILLARS } from "@/lib/pillars";
import { PillarIcon } from "@/components/icons";
import { monthPlanPillarCoverage } from "@/lib/month-plan/coverage";
import type { MonthGoalDto } from "@/lib/month-plan/schema";

type Props = {
  note: string;
  goals: MonthGoalDto[];
};

export function MonthPillarCoverage({ note, goals }: Props) {
  const t = useTranslations("monthPlan");
  const tp = useTranslations("pillars");
  const result = useMemo(() => monthPlanPillarCoverage(note, goals), [note, goals]);
  const complete = !result.empty && result.missing.length === 0;

  return (
    <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-ink">
          {result.empty
            ? t("checkEmptyTitle")
            : t("checkCoverage", {
                covered: result.covered.length,
                total: PILLARS.length,
              })}
        </p>
        <p className="text-xs text-muted">{t("checkHint")}</p>
      </div>

      <ul className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {PILLARS.map((pillar) => {
          const ok = result.covered.includes(pillar.id);
          return (
            <li key={pillar.id}>
              <span
                className={`inline-flex w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold ${
                  ok ? "bg-white text-ink ring-1 ring-emerald-100" : "bg-white/70 text-muted ring-1 ring-slate-100"
                }`}
              >
                {ok ? (
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                    ✓
                  </span>
                ) : (
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full ring-1 ring-slate-300">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: pillar.color, opacity: 0.45 }}
                    />
                  </span>
                )}
                <span
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-white"
                  style={{ backgroundColor: pillar.color, opacity: ok ? 1 : 0.55 }}
                >
                  <PillarIcon id={pillar.id} size={11} />
                </span>
                <span className="truncate">{tp(pillar.id)}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {result.empty ? (
        <p className="mt-2.5 text-xs leading-relaxed text-muted">{t("checkEmpty")}</p>
      ) : complete ? (
        <p className="mt-2.5 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800">
          {t("checkAll")}
        </p>
      ) : (
        <p className="mt-2.5 text-xs leading-relaxed text-muted">
          {t("checkMissing", {
            list: result.missing.map((id) => tp(id)).join(", "),
          })}
        </p>
      )}
    </div>
  );
}
