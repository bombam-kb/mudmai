"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MOOD_LEVELS, isMoodLevel, type MoodLevel } from "@/lib/mood/schema";
import { useMoodStore } from "@/stores/mood-store";

type Props = {
  date: string;
  demoMode?: boolean;
  initialLevel?: MoodLevel | null;
};

export function TodayMood({ date, demoMode, initialLevel = null }: Props) {
  const t = useTranslations("home.mood");
  const stored = useMoodStore((state) => state.moods);
  const [level, setLevel] = useState<MoodLevel | null>(initialLevel);

  useEffect(() => {
    if (demoMode) {
      setLevel(stored.find((item) => item.date === date)?.level ?? null);
      return;
    }
    setLevel(initialLevel);
  }, [date, demoMode, initialLevel, stored]);

  useEffect(() => {
    function onMood(event: Event) {
      const detail = (event as CustomEvent<{ date?: string; level?: MoodLevel }>).detail;
      if (detail?.date === date && isMoodLevel(detail.level)) setLevel(detail.level);
    }
    window.addEventListener("jr-mood", onMood);
    return () => window.removeEventListener("jr-mood", onMood);
  }, [date]);

  async function pick(next: MoodLevel) {
    const previous = level;
    setLevel(next);
    if (demoMode) {
      useMoodStore.getState().setMood(date, next);
      return;
    }
    const response = await fetch("/api/mood", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, level: next }),
    });
    if (!response.ok) setLevel(previous);
  }

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={t("title")}>
      {MOOD_LEVELS.map((item) => {
        const active = level === item.level;
        return (
          <div key={item.level} className="mood-chip group relative">
            <button
              type="button"
              onClick={() => void pick(item.level)}
              aria-pressed={active}
              aria-label={t(item.key)}
              className={`grid h-10 w-10 place-items-center rounded-full text-2xl leading-none transition ${
                active ? "bg-violet-100 ring-2 ring-brand" : "hover:bg-violet-50"
              }`}
            >
              <span className={active ? "mood-pop" : ""}>{item.emoji}</span>
            </button>
            <span className="mood-tip" role="tooltip">
              <span aria-hidden>{item.emoji}</span>
              <span>{t(item.key)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
