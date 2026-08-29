"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AiSparkle, PillarIcon } from "@/components/icons";
import { PILLARS, PILLAR_MAP } from "@/lib/pillars";
import { MOOD_LEVELS, type MoodLevel } from "@/lib/mood/schema";
import { FireworksLayer } from "@/components/celebrate/fireworks";

const MOOD_WASH: Record<MoodLevel, { accent: string }> = {
  1: { accent: "#64748b" },
  2: { accent: "#3b82f6" },
  3: { accent: "#94a3b8" },
  4: { accent: "#7c3aed" },
  5: { accent: "#f59e0b" },
};

export function AppPreviewHero() {
  return (
    <div className="jr-preview-hero relative">
      <div className="jr-preview-back pointer-events-none absolute inset-x-6 top-0 hidden sm:block">
        <VisionPreview compact />
      </div>
      <div className="jr-preview-front relative sm:mt-16">
        <TodayPreview />
      </div>
    </div>
  );
}

export function AppPreviewGallery() {
  const t = useTranslations("marketing");

  return (
    <section id="features" className="scroll-mt-24">
      <p className="text-sm font-semibold uppercase tracking-wide text-personal">
        {t("previewEyebrow")}
      </p>
      <h2 className="mt-2 font-display text-4xl">{t("previewTitle")}</h2>
      <p className="mt-3 max-w-2xl text-muted">{t("previewBody")}</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <VisionPreview />
        <GoalsPreview />
        <NudgePreview />
      </div>
    </section>
  );
}

function PreviewChrome({
  title,
  accent,
  className,
  moodTint,
  children,
}: {
  title: string;
  accent: string;
  className?: string;
  moodTint?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[1.75rem] bg-white shadow-card ring-1 ring-slate-100 ${className ?? ""}`}
      style={moodTint ? { ["--jr-mood" as string]: moodTint } : undefined}
    >
      <div className="flex items-center gap-2 border-b border-black/5 px-4 py-2.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
        <span className="text-xs font-semibold text-muted">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function TodayPreview() {
  const t = useTranslations("marketing");
  const tm = useTranslations("home.mood");
  const todos = [t("sampleTodo1"), t("sampleTodo2"), t("sampleTodo3")];
  const [mood, setMood] = useState<MoodLevel>(4);
  const [done, setDone] = useState([true, false, false]);
  const [burstKey, setBurstKey] = useState(0);
  const allDone = done.every(Boolean);

  useEffect(() => {
    if (!allDone) {
      setBurstKey(0);
      return;
    }
    setBurstKey((key) => key + 1);
    const hide = window.setTimeout(() => setBurstKey(0), 4800);
    return () => window.clearTimeout(hide);
  }, [allDone]);

  function toggleTodo(index: number) {
    setDone((current) => current.map((value, i) => (i === index ? !value : value)));
  }

  const wash = MOOD_WASH[mood];

  return (
    <>
      <PreviewChrome
        title={t("previewToday")}
        accent={wash.accent}
        className="jr-today-preview"
        moodTint={wash.accent}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-xl text-ink">{t("previewToday")}</p>
          <div className="flex gap-0.5" role="group" aria-label={tm("title")}>
            {MOOD_LEVELS.map((item) => {
              const active = mood === item.level;
              return (
                <button
                  key={item.level}
                  type="button"
                  aria-pressed={active}
                  aria-label={tm(item.key)}
                  title={tm(item.key)}
                  onClick={() => setMood(item.level)}
                  className={`grid h-8 w-8 place-items-center rounded-full text-lg transition ${
                    active ? "bg-white/80" : "hover:bg-white/50"
                  }`}
                  style={
                    active
                      ? { boxShadow: `0 0 0 2px ${wash.accent}` }
                      : undefined
                  }
                >
                  <span className={active ? "mood-pop" : ""}>{item.emoji}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">{t("sampleQuota")}</p>
        <ul className="mt-3 space-y-2">
          {todos.map((title, index) => {
            const checked = done[index];
            return (
              <li key={title}>
                <button
                  type="button"
                  aria-pressed={checked}
                  onClick={() => toggleTodo(index)}
                  className="flex w-full items-start gap-2 rounded-2xl bg-white/70 px-3 py-2 text-left transition hover:bg-white"
                >
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 text-[10px] font-bold ${
                      checked
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {checked ? "✓" : ""}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      checked ? "text-muted line-through" : "text-ink"
                    }`}
                  >
                    {title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {allDone ? null : (
          <p className="mt-3 text-center text-xs font-semibold text-muted">
            {t("previewPlayHint")}
          </p>
        )}
      </PreviewChrome>
      {burstKey > 0 ? (
        <div
          key={burstKey}
          className="pointer-events-none fixed inset-0 z-50"
          aria-hidden
        >
          <FireworksLayer />
        </div>
      ) : null}
    </>
  );
}

function VisionPreview({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("marketing");
  const notes = [
    { title: t("sampleVision1"), pillar: PILLARS[1], rotate: "-rotate-2", left: "8%", top: "18%" },
    { title: t("sampleVision2"), pillar: PILLARS[4], rotate: "rotate-3", left: "42%", top: "8%" },
    { title: t("sampleVision3"), pillar: PILLARS[5], rotate: "-rotate-1", left: "28%", top: "52%" },
  ] as const;

  return (
    <PreviewChrome title={t("previewVision")} accent="#8b5cf6">
      <div
        className={`relative overflow-hidden rounded-2xl bg-slate-50 ${
          compact ? "h-36" : "h-48"
        }`}
      >
        {notes.map((note) => (
          <div
            key={note.title}
            className={`absolute w-[42%] rounded-xl bg-white p-2 shadow-card ring-1 ring-slate-100 ${note.rotate}`}
            style={{ left: note.left, top: note.top }}
          >
            <span
              className="grid h-6 w-6 place-items-center rounded-lg text-white"
              style={{ backgroundColor: note.pillar.color }}
            >
              <PillarIcon id={note.pillar.id} size={12} />
            </span>
            <p className="mt-1 line-clamp-2 text-xs font-semibold text-ink">{note.title}</p>
          </div>
        ))}
      </div>
    </PreviewChrome>
  );
}

function GoalsPreview() {
  const t = useTranslations("marketing");
  const miles = [t("sampleMile1"), t("sampleMile2"), t("sampleMile3"), t("sampleMile4")];
  const [done, setDone] = useState([true, false, false, false]);
  const percent = Math.round((done.filter(Boolean).length / miles.length) * 100);

  function toggle(index: number) {
    setDone((current) => current.map((value, i) => (i === index ? !value : value)));
  }

  return (
    <PreviewChrome title={t("previewGoals")} accent="#2563eb">
      <p className="text-xs font-semibold uppercase tracking-wide text-career">Q1</p>
      <p className="mt-1 font-display text-lg text-ink">{t("sampleGoal")}</p>
      <p className="mt-1 text-sm text-muted">{t("sampleGoalMeta")}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-career transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-semibold text-muted">{percent}%</p>
      <ul className="mt-3 space-y-1.5">
        {miles.map((title, index) => {
          const checked = done[index];
          return (
            <li key={title}>
              <button
                type="button"
                aria-pressed={checked}
                onClick={() => toggle(index)}
                className="flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left text-sm transition hover:bg-slate-50"
              >
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 text-[9px] font-bold ${
                    checked
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {checked ? "✓" : ""}
                </span>
                <span className={checked ? "text-muted line-through" : "text-ink"}>
                  {title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </PreviewChrome>
  );
}

function NudgePreview() {
  const t = useTranslations("marketing");

  return (
    <PreviewChrome title={t("previewNudge")} accent="#d946ef">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-4 text-white">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/80">
          <AiSparkle size={12} painted toColor={PILLAR_MAP.PERSONAL.color} />
          {t("sampleNudgeTag")}
        </p>
        <p className="mt-2 text-sm leading-relaxed">{t("sampleNudge")}</p>
      </div>
    </PreviewChrome>
  );
}
