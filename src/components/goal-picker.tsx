"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { NavIcon } from "@/components/icons";
import type { GoalOption } from "@/lib/todos/schema";

type Props = {
  value: string;
  goals: GoalOption[];
  disabled?: boolean;
  size?: "compact" | "field" | "featured";
  className?: string;
  onChange: (goalId: string) => void;
};

export function GoalPicker({
  value,
  goals,
  disabled,
  size = "field",
  className = "",
  onChange,
}: Props) {
  const t = useTranslations("todos");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = goals.find((goal) => goal.id === value) ?? null;
  const tall = size === "field" || size === "featured";

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const buttonClass =
    size === "featured"
      ? "jr-picker-trigger inline-flex h-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3.5 text-sm font-semibold text-muted outline-none ring-brand/30 hover:bg-white focus:bg-white focus:ring-2 disabled:opacity-50"
      : size === "field"
        ? "jr-picker-trigger inline-flex h-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-muted outline-none ring-brand/30 hover:bg-white focus:bg-white focus:ring-2 disabled:opacity-50"
        : "jr-picker-trigger inline-flex max-w-[10.5rem] items-center justify-center gap-1.5 rounded-full bg-white px-2 py-1 text-xs font-semibold text-muted ring-1 ring-slate-200 disabled:opacity-50";

  return (
    <div
      ref={rootRef}
      className={`jr-composer-extra relative min-w-0 ${tall ? "self-stretch" : ""} ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selected ? `${t("linkGoal")}: ${selected.title}` : t("linkGoal")}
        title={selected ? selected.title : t("linkGoal")}
        onClick={() => setOpen((current) => !current)}
        className={`${buttonClass} ${tall ? "w-full" : ""} ${selected ? "text-brand" : ""}`}
      >
        <NavIcon name="goals" size={tall ? 18 : 14} active={Boolean(selected)} />
        <span className="jr-picker-label truncate">
          {selected ? selected.title : t("linkGoal")}
        </span>
      </button>
      {open ? (
        <ul
          role="listbox"
          className="jr-picker-menu absolute left-0 z-30 mt-1 max-h-64 min-w-[14rem] overflow-y-auto rounded-2xl bg-white p-1 shadow-card ring-1 ring-slate-100"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!selected}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs font-semibold text-muted hover:bg-slate-50"
            >
              {t("unlinked")}
            </button>
          </li>
          {goals.map((goal) => (
            <li key={goal.id}>
              <button
                type="button"
                role="option"
                aria-selected={value === goal.id}
                onClick={() => {
                  onChange(goal.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 ${
                  value === goal.id ? "bg-violet-50 text-ink" : "text-ink"
                }`}
              >
                <NavIcon name="goals" size={14} active={value === goal.id} />
                <span className="min-w-0 flex-1 truncate">{goal.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
