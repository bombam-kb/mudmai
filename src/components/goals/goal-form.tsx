"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { PILLARS, type PillarId } from "@/lib/pillars";
import { PillarIcon } from "@/components/icons";
import {
  emptyGoal,
  GOAL_STATUSES,
  type GoalDto,
  type GoalInput,
  type MilestoneInput,
} from "@/lib/goals/schema";
import { currentQuarter, quarterBounds } from "@/lib/year";
import { inputToDto, useGoalsStore } from "@/stores/goals-store";

const UNIT_PRESETS = ["times", "days", "books", "percent", "thb", "km"] as const;

type Props = {
  demoMode: boolean;
  initial?: GoalDto | null;
  quarter?: number;
  pillar?: PillarId;
};

export function GoalForm({ demoMode, initial, quarter, pillar }: Props) {
  const t = useTranslations("goals");
  const tp = useTranslations("pillars");
  const router = useRouter();
  const upsert = useGoalsStore((state) => state.upsert);
  const [form, setForm] = useState<GoalInput>(
    initial ?? emptyGoal(quarter ?? currentQuarter(), pillar),
  );
  const isEdit = Boolean(initial?.id);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showMore, setShowMore] = useState(() =>
    Boolean(
      initial &&
        (initial.description ||
          initial.milestones.length > 0 ||
          (initial.specificOutcome && initial.specificOutcome !== initial.title)),
    ),
  );

  const bounds = useMemo(
    () => quarterBounds(form.year, form.quarter),
    [form.year, form.quarter],
  );

  function update<K extends keyof GoalInput>(key: K, value: GoalInput[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "quarter" || key === "year") {
        const range = quarterBounds(next.year, next.quarter);
        if (!next.deadline || next.deadline < range.start || next.deadline > range.end) {
          next.deadline = range.end;
        }
        next.milestones = next.milestones.map((milestone) => ({
          ...milestone,
          dueDate:
            milestone.dueDate >= range.start && milestone.dueDate <= range.end
              ? milestone.dueDate
              : range.end,
        }));
      }
      return next;
    });
  }

  function updateMilestone(index: number, patch: Partial<MilestoneInput>) {
    setForm((current) => ({
      ...current,
      milestones: current.milestones.map((milestone, i) =>
        i === index ? { ...milestone, ...patch } : milestone,
      ),
    }));
  }

  function payload(): GoalInput {
    const title = form.title.trim();
    return {
      ...form,
      title,
      description: form.description.trim(),
      specificOutcome: form.specificOutcome.trim() || title,
      unit: form.unit.trim(),
    };
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const data = payload();
    if (!data.title) {
      setError(t("error"));
      return;
    }
    if (!(data.targetValue > 0) || !data.unit) {
      setError(t("errorMeasure"));
      return;
    }
    setPending(true);
    try {
      if (demoMode) {
        const id = initial?.id ?? crypto.randomUUID();
        upsert(inputToDto(id, data));
        router.replace("/goals");
        return;
      }

      const response = await fetch(isEdit ? `/api/goals/${initial!.id}` : "/api/goals", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("save");
      router.replace("/goals");
      router.refresh();
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!initial?.id) return;
    if (demoMode) {
      useGoalsStore.getState().remove(initial.id);
      router.replace("/goals");
      return;
    }
    await fetch(`/api/goals/${initial.id}`, { method: "DELETE" });
    router.replace("/goals");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <section className="rounded-[2rem] bg-white p-5 shadow-card ring-1 ring-slate-100 sm:p-6">
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4].map((value) => (
            <Chip
              key={value}
              selected={form.quarter === value}
              onClick={() => update("quarter", value)}
            >
              Q{value}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PILLARS.map((item) => (
            <Chip
              key={item.id}
              selected={form.pillar === item.id}
              color={item.color}
              onClick={() => update("pillar", item.id)}
            >
              <PillarIcon id={item.id} size={14} />
              {tp(item.id)}
            </Chip>
          ))}
        </div>

        <label className="mt-6 block">
          <span className="text-sm font-semibold text-muted">{t("titlePrompt")}</span>
          <input
            required
            autoComplete="off"
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder={t("titlePlaceholder")}
            className="mt-2 w-full border-0 border-b border-slate-200 bg-transparent pb-2 font-display text-2xl text-ink outline-none placeholder:text-slate-300 focus:border-brand sm:text-3xl"
          />
        </label>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-card ring-1 ring-slate-100 sm:p-6">
        <p className="text-sm font-semibold text-muted">{t("measurePrompt")}</p>
        <div className="jr-measure-row mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{t("measureHit")}</span>
          <input
            required
            type="number"
            min={0.01}
            step="any"
            inputMode="decimal"
            value={form.targetValue || ""}
            onChange={(event) => update("targetValue", Number(event.target.value) || 0)}
            placeholder="12"
            aria-label={t("target")}
            className="w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-lg font-semibold outline-none ring-brand/30 focus:bg-white focus:ring-2"
          />
          <input
            required
            value={form.unit}
            onChange={(event) => update("unit", event.target.value)}
            placeholder={t("unitPlaceholder")}
            aria-label={t("unit")}
            className="w-28 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold outline-none ring-brand/30 focus:bg-white focus:ring-2"
          />
          <span className="text-sm text-muted">{t("measureBy")}</span>
          <input
            required
            type="date"
            min={bounds.start}
            max={bounds.end}
            value={form.deadline || bounds.end}
            onChange={(event) => update("deadline", event.target.value)}
            aria-label={t("deadline")}
            className="min-w-0 max-w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none ring-brand/30 focus:bg-white focus:ring-2"
          />
          <button
            type="button"
            onClick={() => update("deadline", bounds.end)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              form.deadline === bounds.end
                ? "bg-ink text-white"
                : "bg-slate-100 text-muted"
            }`}
          >
            {t("measureEndOfQuarter")}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {UNIT_PRESETS.map((key) => {
            const label = t(`unitPresets.${key}`);
            return (
              <Chip
                key={key}
                selected={form.unit === label}
                onClick={() => update("unit", form.unit === label ? "" : label)}
              >
                {label}
              </Chip>
            );
          })}
        </div>

        {isEdit ? (
          <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-5">
            <label className="text-sm font-semibold">
              {t("current")}
              <input
                type="number"
                min={0}
                step="any"
                value={form.currentValue}
                onChange={(event) => update("currentValue", Number(event.target.value) || 0)}
                className="mt-1 w-28 rounded-2xl border border-slate-200 px-3 py-2"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GOAL_STATUSES.map((status) => (
                <Chip
                  key={status}
                  selected={form.status === status}
                  onClick={() => update("status", status)}
                >
                  {t(`statuses.${status}`)}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div>
        <button
          type="button"
          onClick={() => setShowMore((open) => !open)}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand ring-1 ring-violet-100"
        >
          {showMore ? t("hideDetails") : t("moreDetails")}
        </button>

        {showMore ? (
          <div className="mt-3 space-y-4 rounded-[2rem] bg-white p-5 shadow-card ring-1 ring-slate-100 sm:p-6">
            <label className="block text-sm font-semibold">
              {t("why")}
              <textarea
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                rows={2}
                placeholder={t("whyPlaceholder")}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-brand/30 focus:ring-2"
              />
            </label>
            <label className="block text-sm font-semibold">
              {t("specific")}
              <textarea
                value={form.specificOutcome}
                onChange={(event) => update("specificOutcome", event.target.value)}
                rows={2}
                placeholder={t("specificHint")}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-brand/30 focus:ring-2"
              />
            </label>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t("milestones")}</h2>
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      milestones: [
                        ...current.milestones,
                        {
                          title: "",
                          dueDate: bounds.end,
                          isDone: false,
                          order: current.milestones.length,
                        },
                      ],
                    }))
                  }
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold"
                >
                  {t("addMilestone")}
                </button>
              </div>
              {form.milestones.length > 0 ? (
                <div className="space-y-3">
                  {form.milestones.map((milestone, index) => (
                    <div
                      key={milestone.id ?? index}
                      className="grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-[1fr_160px_auto]"
                    >
                      <input
                        required
                        value={milestone.title}
                        onChange={(event) =>
                          updateMilestone(index, { title: event.target.value })
                        }
                        placeholder={t("milestoneTitle")}
                        className="rounded-xl border border-slate-200 px-3 py-2"
                      />
                      <input
                        required
                        type="date"
                        min={bounds.start}
                        max={bounds.end}
                        value={milestone.dueDate}
                        onChange={(event) =>
                          updateMilestone(index, { dueDate: event.target.value })
                        }
                        className="rounded-xl border border-slate-200 px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            milestones: current.milestones.filter((_, i) => i !== index),
                          }))
                        }
                        className="text-sm font-semibold text-physical"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-physical">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-6 py-3 font-semibold text-white disabled:opacity-60"
        >
          {pending ? t("saving") : isEdit ? t("saveEdit") : t("saveCreate")}
        </button>
        {isEdit ? (
          <button
            type="button"
            onClick={() => void onDelete()}
            className="rounded-full bg-white px-6 py-3 font-semibold text-physical ring-1 ring-rose-200"
          >
            {t("delete")}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Chip({
  selected,
  onClick,
  children,
  color,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
        selected ? "text-white" : "bg-slate-50 text-muted ring-1 ring-slate-200 hover:bg-white"
      }`}
      style={selected ? { backgroundColor: color ?? "#0f172a" } : undefined}
    >
      {children}
    </button>
  );
}
