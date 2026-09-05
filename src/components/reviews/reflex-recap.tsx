"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FireworksLayer } from "@/components/celebrate/fireworks";
import { PillarIcon } from "@/components/icons";
import {
  formatScore,
  healthStyle,
  type MonthHealth,
  type PillarRatingStatus,
} from "@/lib/reviews/analytics";
import type { MonthlyReflexData } from "@/lib/reviews/reflex";
import type { MonthGoalDto } from "@/lib/month-plan/schema";

const AUTO_MS = 7500;

type Props = {
  data: MonthlyReflexData;
  monthLabel: string;
  onClose: () => void;
};

type Slide =
  | { id: "intro"; score: number; health: MonthHealth }
  | { id: "loved"; text: string }
  | { id: "stop"; text: string }
  | { id: "continue"; text: string }
  | { id: "pillars"; items: PillarRatingStatus[]; score: number; health: MonthHealth }
  | {
      id: "highlights";
      note: string;
      goals: MonthGoalDto[];
      progress: MonthlyReflexData["planProgress"];
    }
  | { id: "todos"; stats: MonthlyReflexData["todoStats"]; highlights: string[] }
  | { id: "memory"; imageUrl: string; caption: string }
  | { id: "outro"; delta: number | null; health: MonthHealth };

export function ReflexRecap({ data, monthLabel, onClose }: Props) {
  const t = useTranslations("reviews.reflex");
  const tp = useTranslations("pillars");
  const to = useTranslations("reviews.overview");
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [fireworks, setFireworks] = useState(false);
  const timerRef = useRef<number | null>(null);

  const slides = useMemo(() => buildSlides(data), [data]);
  const slide = slides[index];
  const isLast = index >= slides.length - 1;

  const next = useCallback(() => {
    setIndex((current) => Math.min(current + 1, slides.length - 1));
  }, [slides.length]);

  const prev = useCallback(() => {
    setIndex((current) => Math.max(current - 1, 0));
  }, []);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (reduced || isLast) return;
    timerRef.current = window.setTimeout(next, AUTO_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [index, isLast, next, reduced]);

  useEffect(() => {
    if (slide?.id === "outro") {
      const start = window.setTimeout(() => setFireworks(true), reduced ? 0 : 600);
      return () => window.clearTimeout(start);
    }
    setFireworks(false);
  }, [slide?.id, reduced]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        if (isLast) onClose();
        else next();
      }
      if (event.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLast, next, onClose, prev]);

  if (!slide) return null;

  const progress = ((index + 1) / slides.length) * 100;

  return (
    <div className="jr-reflex" role="dialog" aria-modal="true" aria-label={t("aria")}>
      <div className="jr-reflex-vignette" aria-hidden />
      <div className="jr-reflex-curtain jr-reflex-curtain-left" aria-hidden />
      <div className="jr-reflex-curtain jr-reflex-curtain-right" aria-hidden />
      {fireworks && !reduced ? <FireworksLayer className="jr-reflex-fireworks" /> : null}

      <header className="jr-reflex-top">
        <p className="jr-reflex-brand">{t("brand")}</p>
        <p className="jr-reflex-period">
          {monthLabel} {data.year}
        </p>
        <div className="jr-reflex-progress" aria-hidden>
          <span className="jr-reflex-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="jr-reflex-counter">
          {index + 1} / {slides.length}
        </p>
      </header>

      <div className="jr-reflex-stage" key={slide.id}>
        {slide.id === "intro" ? (
          <>
            <p className="jr-reflex-eyebrow">{t("introEyebrow")}</p>
            <h2 className="jr-reflex-title">{t("introTitle", { month: monthLabel })}</h2>
            <p className="jr-reflex-lede">{t("introBody")}</p>
            <div className="jr-reflex-score-ring mt-8">
              <span className="jr-reflex-score-value">{formatScore(slide.score)}</span>
              <span className="jr-reflex-score-label">{to("overallShort")}</span>
              <StatusChip health={slide.health} label={to(`status.${slide.health}`)} large />
            </div>
          </>
        ) : null}

        {slide.id === "loved" || slide.id === "stop" || slide.id === "continue" ? (
          <>
            <p className="jr-reflex-eyebrow">{t(`slide.${slide.id}.eyebrow`)}</p>
            <h2 className="jr-reflex-title">{t(`slide.${slide.id}.title`)}</h2>
            <p className="jr-reflex-quote">&ldquo;{slide.text}&rdquo;</p>
          </>
        ) : null}

        {slide.id === "pillars" ? (
          <>
            <p className="jr-reflex-eyebrow">{t("slide.pillars.eyebrow")}</p>
            <h2 className="jr-reflex-title">{t("slide.pillars.title")}</h2>
            <ul className="jr-reflex-pillars mt-6">
              {slide.items.map((item) => {
                const style = healthStyle(item.health);
                return (
                  <li key={item.id} className="jr-reflex-pillar-row">
                    <span className="inline-flex items-center gap-2">
                      <PillarIcon id={item.id} size={18} />
                      {tp(item.id)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="font-semibold" style={{ color: style.text }}>
                        {formatScore(item.score)}
                      </span>
                      <StatusChip health={item.health} label={to(`status.${item.health}`)} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        {slide.id === "highlights" ? (
          <>
            <p className="jr-reflex-eyebrow">{t("slide.highlights.eyebrow")}</p>
            <h2 className="jr-reflex-title">{t("slide.highlights.title")}</h2>
            {slide.note ? (
              <p className="jr-reflex-quote mt-4">&ldquo;{slide.note}&rdquo;</p>
            ) : (
              <p className="jr-reflex-muted mt-4">{t("slide.highlights.noNote")}</p>
            )}
            {slide.goals.length > 0 ? (
              <ul className="jr-reflex-goals mt-6">
                {slide.goals.map((goal) => (
                  <li key={goal.id} className={goal.isDone ? "is-done" : ""}>
                    <span>{goal.isDone ? "✓" : "○"}</span>
                    <span>{goal.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="jr-reflex-muted mt-6">{t("slide.highlights.noGoals")}</p>
            )}
            {slide.progress.total > 0 ? (
              <p className="jr-reflex-muted mt-4">
                {t("slide.highlights.progress", {
                  completed: slide.progress.completed,
                  total: slide.progress.total,
                  percent: slide.progress.percent,
                })}
              </p>
            ) : null}
          </>
        ) : null}

        {slide.id === "todos" ? (
          <>
            <p className="jr-reflex-eyebrow">{t("slide.todos.eyebrow")}</p>
            <h2 className="jr-reflex-title">{t("slide.todos.title")}</h2>
            {slide.stats.total > 0 ? (
              <>
                <p className="jr-reflex-stat mt-4">
                  {t("slide.todos.rate", {
                    completed: slide.stats.completed,
                    total: slide.stats.total,
                    rate: slide.stats.rate,
                  })}
                </p>
                {slide.highlights.length > 0 ? (
                  <ul className="jr-reflex-goals mt-6">
                    {slide.highlights.map((title) => (
                      <li key={title} className="is-done">
                        <span>✓</span>
                        <span>{title}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="jr-reflex-muted mt-4">{t("slide.todos.empty")}</p>
            )}
          </>
        ) : null}

        {slide.id === "memory" ? (
          <>
            <p className="jr-reflex-eyebrow">{t("slide.memory.eyebrow")}</p>
            <h2 className="jr-reflex-title">{t("slide.memory.title")}</h2>
            <div className="jr-a5-wrap jr-a5-wrap-reflex mt-4">
              <div className="jr-a5-board is-reflex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.imageUrl} alt="" className="jr-a5-reflex-img" />
              </div>
            </div>
            {slide.caption ? (
              <p className="jr-reflex-quote mt-4">&ldquo;{slide.caption}&rdquo;</p>
            ) : null}
          </>
        ) : null}

        {slide.id === "outro" ? (
          <>
            <p className="jr-reflex-eyebrow">{t("slide.outro.eyebrow")}</p>
            <h2 className="jr-reflex-title">{t("slide.outro.title")}</h2>
            <p className="jr-reflex-lede mt-4">{t("slide.outro.body")}</p>
            {slide.delta !== null && Math.abs(slide.delta) >= 0.1 ? (
              <p className="jr-reflex-muted mt-3">
                {slide.delta > 0
                  ? t("slide.outro.up", { delta: formatScore(slide.delta) })
                  : t("slide.outro.down", { delta: formatScore(Math.abs(slide.delta)) })}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <footer className="jr-reflex-controls">
        <button type="button" className="jr-reflex-btn is-ghost" onClick={onClose}>
          {t("close")}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="jr-reflex-btn is-ghost"
            onClick={prev}
            disabled={index === 0}
          >
            {t("prev")}
          </button>
          <button
            type="button"
            className="jr-reflex-btn is-primary"
            onClick={() => (isLast ? onClose() : next())}
          >
            {isLast ? t("finish") : t("next")}
          </button>
        </div>
      </footer>
    </div>
  );
}

function StatusChip({
  health,
  label,
  large = false,
}: {
  health: MonthHealth;
  label: string;
  large?: boolean;
}) {
  const style = healthStyle(health);
  return (
    <span
      className={`jr-reflex-status ${large ? "is-lg" : ""}`}
      style={{
        color: style.text,
        background: style.bg,
        boxShadow: `inset 0 0 0 1px ${style.border}`,
      }}
    >
      {label}
    </span>
  );
}

function buildSlides(data: MonthlyReflexData): Slide[] {
  const slides: Slide[] = [
    {
      id: "intro",
      score: data.analytics.score,
      health: data.analytics.health,
    },
    { id: "loved", text: data.review.whatILovedMost },
    { id: "stop", text: data.review.whatToStop },
    { id: "continue", text: data.review.whatToContinue },
    {
      id: "pillars",
      items: data.analytics.pillarStatuses,
      score: data.analytics.score,
      health: data.analytics.health,
    },
  ];

  const hasHighlights =
    Boolean(data.monthPlan?.importantNote.trim()) ||
    data.highlightGoals.length > 0 ||
    data.planProgress.total > 0;
  if (hasHighlights) {
    slides.push({
      id: "highlights",
      note: data.monthPlan?.importantNote.trim() ?? "",
      goals: data.highlightGoals,
      progress: data.planProgress,
    });
  }

  slides.push({
    id: "todos",
    stats: data.todoStats,
    highlights: data.todoHighlights,
  });

  if (data.memoryImageUrl) {
    slides.push({
      id: "memory",
      imageUrl: data.memoryImageUrl,
      caption: data.memoryCaption,
    });
  }

  slides.push({
    id: "outro",
    delta: data.analytics.delta,
    health: data.analytics.health,
  });

  return slides;
}
