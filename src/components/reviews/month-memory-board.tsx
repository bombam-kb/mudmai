"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  type MemoryImageMeta,
  type MonthPlanDto,
  MEMORY_CAPTION_MAX,
} from "@/lib/month-plan/schema";
import { useMonthPlanStore } from "@/stores/month-plan-store";

type Props = {
  year: number;
  month: number;
  demoMode: boolean;
  initial: MonthPlanDto;
};

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function MonthMemoryBoard({ year, month, demoMode, initial }: Props) {
  const t = useTranslations("reviews.memory");
  const [plan, setPlan] = useState(initial);
  const [meta, setMeta] = useState<MemoryImageMeta>(initial.memoryImageMeta);
  const [caption, setCaption] = useState(initial.memoryCaption);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const persist = useCallback(
    async (patch: {
      file?: File | null;
      caption?: string;
      meta?: MemoryImageMeta;
      remove?: boolean;
    }) => {
      setPending(true);
      setError(null);
      setSaved(false);
      try {
        if (demoMode) {
          let imageUrl = plan.memoryImageUrl;
          if (patch.remove) {
            imageUrl = null;
          } else if (patch.file) {
            if (patch.file.size > 700_000) throw new Error("size");
            imageUrl = await fileToDataUrl(patch.file);
          }
          const next: MonthPlanDto = {
            ...plan,
            memoryImageUrl: imageUrl,
            memoryCaption: patch.caption ?? caption,
            memoryImageMeta: patch.meta ?? meta,
          };
          useMonthPlanStore.getState().upsert(next);
          setPlan(next);
          setSaved(true);
          return;
        }

        if (patch.remove) {
          const response = await fetch(
            `/api/month-plan/memory?year=${year}&month=${month}`,
            { method: "DELETE" },
          );
          const json = (await response.json()) as { ok: boolean; plan?: MonthPlanDto };
          if (!json.ok || !json.plan) throw new Error("save");
          setPlan(json.plan);
          setCaption(json.plan.memoryCaption);
          setMeta(json.plan.memoryImageMeta);
          setSaved(true);
          return;
        }

        const form = new FormData();
        form.set("year", String(year));
        form.set("month", String(month));
        form.set("caption", patch.caption ?? caption);
        form.set("meta", JSON.stringify(patch.meta ?? meta));
        if (patch.file) form.set("file", patch.file);

        const response = await fetch("/api/month-plan/memory", {
          method: "POST",
          body: form,
        });
        const json = (await response.json()) as {
          ok: boolean;
          plan?: MonthPlanDto;
          reason?: string;
        };
        if (json.reason === "size") throw new Error("size");
        if (json.reason === "type") throw new Error("type");
        if (!json.ok || !json.plan) throw new Error("save");
        setPlan(json.plan);
        setCaption(json.plan.memoryCaption);
        setMeta(json.plan.memoryImageMeta);
        setSaved(true);
      } catch (cause) {
        setError(cause instanceof Error && cause.message === "size" ? "size" : "generic");
      } finally {
        setPending(false);
      }
    },
    [caption, demoMode, meta, month, plan, year],
  );

  function onPointerDown(event: React.PointerEvent) {
    if (!plan.memoryImageUrl) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      ox: meta.offsetX,
      oy: meta.offsetY,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = ((event.clientX - drag.x) / 180) * 100;
    const dy = ((event.clientY - drag.y) / 260) * 100;
    setMeta({
      ...meta,
      offsetX: Math.min(40, Math.max(-40, drag.ox + dx)),
      offsetY: Math.min(40, Math.max(-40, drag.oy + dy)),
    });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">{t("eyebrow")}</p>
      <h2 className="font-display text-2xl text-ink">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted">{t("hint")}</p>

      <div className="jr-a5-wrap mt-4">
        <div className="jr-a5-board">
          {plan.memoryImageUrl ? (
            <div
              className="jr-a5-photo"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={plan.memoryImageUrl}
                alt=""
                draggable={false}
                style={{
                  transform: `translate(${meta.offsetX}%, ${meta.offsetY}%) scale(${meta.scale})`,
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              className="jr-a5-empty"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
            >
              <span className="text-2xl" aria-hidden>
                +
              </span>
              <span className="mt-2 text-sm font-semibold">{t("addPhoto")}</span>
              <span className="mt-1 text-xs text-muted">{t("a5Note")}</span>
            </button>
          )}
          <span className="jr-a5-label" aria-hidden>
            A5
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void persist({ file });
        }}
      />

      {plan.memoryImageUrl ? (
        <div className="mt-4 grid gap-3">
          <label className="block text-sm">
            <span className="font-semibold text-ink">{t("caption")}</span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value.slice(0, MEMORY_CAPTION_MAX))}
              rows={2}
              placeholder={t("captionPlaceholder")}
              className="mt-1 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-ink">{t("zoom")}</span>
            <input
              type="range"
              min={1}
              max={2.5}
              step={0.05}
              value={meta.scale}
              onChange={(event) =>
                setMeta({ ...meta, scale: Number(event.target.value) })
              }
              className="mt-2 w-full"
            />
          </label>
          <p className="text-xs text-muted">{t("dragHint")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => void persist({ caption, meta })}
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? t("saving") : t("save")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
            >
              {t("replace")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void persist({ remove: true })}
              className="rounded-full px-4 py-2 text-sm font-semibold text-physical disabled:opacity-50"
            >
              {t("remove")}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-physical">
          {error === "size" ? t("errorSize") : t("error")}
        </p>
      ) : null}
      {saved ? <p className="mt-2 text-sm text-finance">{t("saved")}</p> : null}
    </section>
  );
}

export function MonthMemoryThumb({ imageUrl, caption }: { imageUrl: string; caption?: string }) {
  return (
    <div className="jr-a5-thumb" title={caption}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" />
    </div>
  );
}
