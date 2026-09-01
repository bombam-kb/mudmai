"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PILLARS, PILLAR_MAP, type PillarId } from "@/lib/pillars";
import { PillarIcon } from "@/components/icons";

type Props = {
  value: PillarId | null;
  disabled?: boolean;
  allowEmpty?: boolean;
  size?: "compact" | "field" | "featured";
  tone?: "muted" | "plain";
  className?: string;
  onChange: (pillar: PillarId | null) => void;
};

export function PillarPicker({
  value,
  disabled,
  allowEmpty = true,
  size = "compact",
  tone = "muted",
  className = "",
  onChange,
}: Props) {
  const t = useTranslations("monthPlan");
  const tp = useTranslations("pillars");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = value ? PILLAR_MAP[value] : null;
  const tall = size === "field" || size === "featured";

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const surface = tone === "plain" ? "bg-white" : "bg-slate-50";
  const buttonClass =
    size === "featured"
      ? `jr-picker-trigger inline-flex h-full items-center justify-center gap-2 rounded-2xl border border-slate-200 ${surface} px-3 py-3.5 text-sm font-semibold text-muted outline-none ring-brand/30 hover:bg-white focus:bg-white focus:ring-2 disabled:opacity-50`
      : size === "field"
        ? `jr-picker-trigger inline-flex h-full items-center justify-center gap-2 rounded-2xl border border-slate-200 ${surface} px-3 py-2.5 text-sm font-semibold text-muted outline-none ring-brand/30 hover:bg-white focus:bg-white focus:ring-2 disabled:opacity-50`
        : "jr-picker-trigger inline-flex max-w-[10.5rem] items-center justify-center gap-1.5 rounded-full bg-white px-2 py-1 text-xs font-semibold text-muted ring-1 ring-slate-200 disabled:opacity-50";

  return (
    <div ref={rootRef} className={`relative min-w-0 ${tall ? "self-stretch" : ""} ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selected ? `${t("pillar")}: ${tp(selected.id)}` : t("pillar")}
        title={selected ? tp(selected.id) : t("pickPillar")}
        onClick={() => setOpen((current) => !current)}
        className={`${buttonClass} ${tall ? "w-full" : ""}`}
      >
        {selected ? (
          <>
            <span
              className={`grid shrink-0 place-items-center rounded-full text-white ${
                tall ? "h-6 w-6" : "h-5 w-5"
              }`}
              style={{ backgroundColor: selected.color }}
            >
              <PillarIcon id={selected.id} size={tall ? 13 : 11} />
            </span>
            <span className="jr-picker-label truncate">{tp(selected.id)}</span>
          </>
        ) : (
          <span className="jr-picker-label">{t("pickPillar")}</span>
        )}
      </button>
      {open ? (
        <ul
          role="listbox"
          className="jr-picker-menu absolute right-0 z-30 mt-1 min-w-[12rem] rounded-2xl bg-white p-1 shadow-card ring-1 ring-slate-100"
        >
          {allowEmpty ? (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!selected}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs font-semibold text-muted hover:bg-slate-50"
              >
                {t("pickPillar")}
              </button>
            </li>
          ) : null}
          {PILLARS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={value === item.id}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 ${
                  value === item.id ? "bg-violet-50 text-ink" : "text-ink"
                }`}
              >
                <span
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-white"
                  style={{ backgroundColor: item.color }}
                >
                  <PillarIcon id={item.id} size={11} />
                </span>
                {tp(item.id)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
