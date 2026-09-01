"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AiSparkle } from "@/components/icons";
import { hrefForNudge, type NudgeDto, type NudgeTriggerId } from "@/lib/nudge/schema";
import { PILLAR_MAP } from "@/lib/pillars";
import { useNudgeStore } from "@/stores/nudge-store";

function sparkleToColor(trigger: NudgeTriggerId) {
  if (trigger === "LOW_MENTAL_SCORE") return PILLAR_MAP.MENTAL_HEALTH.color;
  if (trigger === "LOW_CAREER_SCORE") return PILLAR_MAP.CAREER.color;
  return PILLAR_MAP.PERSONAL.color;
}

type Props = {
  demoMode?: boolean;
  initialNudges?: NudgeDto[];
};

export function NudgeCards({ demoMode, initialNudges = [] }: Props) {
  const t = useTranslations("nudge");
  const stored = useNudgeStore((state) => state.nudges);
  const [live, setLive] = useState(initialNudges);

  useEffect(() => {
    setLive(initialNudges);
  }, [initialNudges]);

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
    <div className="jr-nudge-list">
      {unread.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {unread.map((nudge) => (
            <li key={nudge.id} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                <AiSparkle size={12} painted toColor={sparkleToColor(nudge.triggerReason)} />
                {t(`trigger.${nudge.triggerReason}`)}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink">{nudge.nudgeText}</p>
              <div className="mt-3 flex gap-2">
                <Link
                  href={hrefForNudge(nudge.triggerReason)}
                  className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white"
                >
                  {t("open")}
                </Link>
                <button
                  type="button"
                  onClick={() => void dismiss(nudge.id)}
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink ring-1 ring-slate-200"
                >
                  {t("dismiss")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
