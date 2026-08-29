"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MOOD_LEVELS, isMoodLevel, type MoodLevel } from "@/lib/mood/schema";
import { useMoodStore } from "@/stores/mood-store";
import { localYmd } from "@/lib/year";
import { FireworksLayer } from "@/components/celebrate/fireworks";

function emitMood(date: string, level: MoodLevel) {
  window.dispatchEvent(new CustomEvent("jr-mood", { detail: { date, level } }));
}

export function DayCompleteBurst({
  demoMode,
  onDone,
}: {
  demoMode: boolean;
  onDone: () => void;
}) {
  const t = useTranslations("todos.celebrate");
  const tm = useTranslations("home.mood");
  const today = localYmd();
  const [reduced, setReduced] = useState(false);
  const [fireworks, setFireworks] = useState(false);
  const [moodReady, setMoodReady] = useState(false);
  const [mood, setMood] = useState<MoodLevel | null>(null);
  const [savingMood, setSavingMood] = useState(false);
  const [moodError, setMoodError] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const start = window.setTimeout(() => setFireworks(true), 900);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(start);
    };
  }, []);

  useEffect(() => {
    if (demoMode) {
      setMood(useMoodStore.getState().forDate(today));
      setMoodReady(true);
      return;
    }
    let cancelled = false;
    void fetch(`/api/mood?date=${today}`)
      .then(async (response) => {
        const json = (await response.json()) as { level?: unknown };
        if (cancelled) return;
        setMood(isMoodLevel(json.level) ? json.level : null);
      })
      .catch(() => {
        if (!cancelled) setMood(null);
      })
      .finally(() => {
        if (!cancelled) setMoodReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [demoMode, today]);

  useEffect(() => {
    if (moodReady && mood && closeRef.current) closeRef.current.focus();
  }, [moodReady, mood]);

  async function pickMood(level: MoodLevel) {
    if (savingMood) return;
    const previous = mood;
    setMood(level);
    setMoodError(false);
    if (demoMode) {
      useMoodStore.getState().setMood(today, level);
      emitMood(today, level);
      return;
    }
    setSavingMood(true);
    try {
      const response = await fetch("/api/mood", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, level }),
      });
      if (!response.ok) throw new Error("mood");
      emitMood(today, level);
    } catch {
      setMood(previous);
      setMoodError(true);
    } finally {
      setSavingMood(false);
    }
  }

  const canClose = moodReady && mood !== null && !savingMood;
  const needsRating = moodReady && mood === null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && canClose) onDone();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canClose, onDone]);

  return (
    <div className="celebrate-overlay">
      {fireworks && !reduced ? <FireworksLayer /> : null}

      <div
        className="celebrate-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebrate-title"
        aria-describedby="celebrate-body"
      >
        <p className="text-sm font-semibold tracking-wide text-brand">{t("eyebrow")}</p>
        <h2 id="celebrate-title" className="mt-1 font-display text-3xl text-ink">
          {t("title")}
        </h2>
        <p id="celebrate-body" className="mt-3 text-base leading-relaxed text-ink/80">
          {t("body")}
        </p>

        {!moodReady ? (
          <p className="mt-5 text-sm text-muted">{t("loading")}</p>
        ) : needsRating ? (
          <div className="mt-5 rounded-2xl bg-violet-50/80 px-4 py-4">
            <p className="text-sm font-semibold text-ink">{t("rateTitle")}</p>
            <p className="mt-1 text-sm text-muted">{t("rateHint")}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1" role="group" aria-label={tm("title")}>
              {MOOD_LEVELS.map((item) => (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => void pickMood(item.level)}
                  disabled={savingMood}
                  aria-label={tm(item.key)}
                  className="grid h-12 w-12 place-items-center rounded-full text-3xl leading-none transition hover:bg-white disabled:opacity-50"
                >
                  {item.emoji}
                </button>
              ))}
            </div>
            {moodError ? <p className="mt-2 text-center text-sm text-red-600">{t("rateError")}</p> : null}
          </div>
        ) : mood ? (
          <p className="celebrate-empathy mt-5">{t(`empathy${mood}`)}</p>
        ) : null}

        <button
          ref={closeRef}
          type="button"
          onClick={onDone}
          disabled={!canClose}
          className="mt-6 w-full rounded-full bg-brand py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {t("close")}
        </button>
      </div>
    </div>
  );
}
