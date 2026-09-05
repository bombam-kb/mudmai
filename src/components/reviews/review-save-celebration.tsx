"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FireworksLayer } from "@/components/celebrate/fireworks";

type Kind = "monthly" | "quarterly";

export function ReviewSaveCelebration({
  kind,
  onDone,
}: {
  kind: Kind;
  onDone: () => void;
}) {
  const t = useTranslations("reviews.savedCelebration");
  const closeRef = useRef<HTMLButtonElement>(null);
  const [reduced, setReduced] = useState(false);
  const [fireworks, setFireworks] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const start = window.setTimeout(() => setFireworks(true), 500);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(start);
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onDone();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  const body = kind === "quarterly" ? t("bodyQuarterly") : t("bodyMonthly");

  return (
    <div className="celebrate-overlay">
      {fireworks && !reduced ? <FireworksLayer /> : null}
      <div
        className="celebrate-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-celebrate-title"
        aria-describedby="review-celebrate-body"
      >
        <p className="text-sm font-semibold tracking-wide text-brand">{t("eyebrow")}</p>
        <h2 id="review-celebrate-title" className="mt-1 font-display text-3xl text-ink">
          {t("title")}
        </h2>
        <p id="review-celebrate-body" className="celebrate-empathy mt-4 text-base leading-relaxed text-ink/85">
          {body}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onDone}
          className="mt-6 w-full rounded-full bg-brand py-3 text-sm font-semibold text-white"
        >
          {t("close")}
        </button>
      </div>
    </div>
  );
}
