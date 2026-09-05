"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ReflexRecap } from "@/components/reviews/reflex-recap";
import { useMonthLabel } from "@/components/reviews/year-overview";
import { buildDemoReflex, type MonthlyReflexData } from "@/lib/reviews/reflex";
import { useMonthPlanStore } from "@/stores/month-plan-store";
import { useReviewsStore } from "@/stores/reviews-store";

type Props = {
  year: number;
  month: number;
  demoMode: boolean;
  onClose?: () => void;
};

export function ReflexRecapLoader({ year, month, demoMode, onClose }: Props) {
  const t = useTranslations("reviews.reflex");
  const router = useRouter();
  const monthLabel = useMonthLabel();
  const [data, setData] = useState<MonthlyReflexData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        if (demoMode) {
          const review = useReviewsStore
            .getState()
            .monthly.find((item) => item.year === year && item.month === month);
          if (!review) throw new Error("missing");
          const plan = useMonthPlanStore.getState().forMonth(year, month);
          const hasPlan =
            plan.goals.length > 0 ||
            Boolean(plan.importantNote.trim()) ||
            Boolean(plan.memoryImageUrl);
          if (!cancelled) {
            setData(buildDemoReflex(review, hasPlan ? plan : null));
          }
          return;
        }
        const response = await fetch(
          `/api/reviews/monthly/recap?year=${year}&month=${month}`,
        );
        const json = (await response.json()) as {
          ok: boolean;
          recap?: MonthlyReflexData;
        };
        if (!json.ok || !json.recap) throw new Error("missing");
        if (!cancelled) setData(json.recap);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [demoMode, month, year]);

  function close() {
    if (onClose) onClose();
    else router.push("/reviews");
  }

  if (loading) {
    return (
      <div className="jr-reflex jr-reflex-loading">
        <p className="jr-reflex-brand">{t("brand")}</p>
        <p className="jr-reflex-lede mt-4">{t("loading")}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="jr-reflex jr-reflex-loading">
        <p className="jr-reflex-title">{t("missingTitle")}</p>
        <p className="jr-reflex-muted mt-2">{t("missingBody")}</p>
        <button type="button" className="jr-reflex-btn is-primary mt-6" onClick={close}>
          {t("close")}
        </button>
      </div>
    );
  }

  return (
    <ReflexRecap data={data} monthLabel={monthLabel(month)} onClose={close} />
  );
}
