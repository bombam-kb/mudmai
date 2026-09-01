"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { PILLAR_MAP } from "@/lib/pillars";
import { PillarIcon } from "@/components/icons";
import { GOAL_STATUSES, type GoalDto } from "@/lib/goals/schema";
import { goalProgressPercent } from "@/lib/pillars";
import { useGoalsStore } from "@/stores/goals-store";

type Props = {
  goal: GoalDto;
  demoMode: boolean;
  onChange: (goal: GoalDto) => void;
};

export function GoalCard({ goal, demoMode, onChange }: Props) {
  const t = useTranslations("goals");
  const tp = useTranslations("pillars");
  const router = useRouter();
  const pillar = PILLAR_MAP[goal.pillar];
  const progress = goalProgressPercent(goal.currentValue, goal.targetValue);

  async function patch(partial: Partial<GoalDto>) {
    const next: GoalDto = {
      ...goal,
      ...partial,
      progress: goalProgressPercent(
        partial.currentValue ?? goal.currentValue,
        goal.targetValue,
      ),
      milestones: partial.milestones ?? goal.milestones,
    };
    if (demoMode) {
      useGoalsStore.getState().replace(next);
      onChange(next);
      return;
    }
    const response = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    if (response.ok) {
      const json = (await response.json()) as { goal: GoalDto };
      onChange(json.goal);
      router.refresh();
    }
  }

  async function toggleMilestone(id: string, isDone: boolean) {
    if (demoMode) {
      const next: GoalDto = {
        ...goal,
        milestones: goal.milestones.map((milestone) =>
          milestone.id === id ? { ...milestone, id, isDone } : milestone,
        ),
      };
      useGoalsStore.getState().replace(next);
      onChange(next);
      return;
    }
    const response = await fetch(`/api/milestones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone }),
    });
    if (response.ok) {
      const json = (await response.json()) as { goal: GoalDto };
      onChange(json.goal);
      router.refresh();
    }
  }

  return (
    <article
      className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100"
      style={{ borderTop: `5px solid ${pillar.color}` }}
    >
      <div className="jr-goal-head flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
            <PillarIcon id={goal.pillar} size={16} /> {tp(goal.pillar)} · Q{goal.quarter}
          </p>
          <h3 className="mt-1 font-display text-2xl text-ink">{goal.title}</h3>
        </div>
        <select
          value={goal.status}
          onChange={(event) => patch({ status: event.target.value as GoalDto["status"] })}
          className="jr-goal-status max-w-full rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold"
        >
          {GOAL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`statuses.${status}`)}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted">{goal.specificOutcome}</p>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-sm font-semibold">
          <span>
            {goal.currentValue} / {goal.targetValue} {goal.unit}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, backgroundColor: pillar.color }}
          />
        </div>
      </div>
      <label className="jr-goal-progress mt-3 flex items-center gap-2 text-sm">
        {t("updateProgress")}
        <input
          type="number"
          min={0}
          step="any"
          defaultValue={goal.currentValue}
          key={goal.currentValue}
          onBlur={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value) && value !== goal.currentValue) {
              void patch({ currentValue: value });
            }
          }}
          className="w-24 rounded-xl border border-slate-200 px-2 py-1"
        />
      </label>
      {goal.milestones.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {goal.milestones.map((milestone) => (
            <li key={milestone.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={milestone.isDone}
                onChange={(event) => {
                  const id = milestone.id;
                  if (id) void toggleMilestone(id, event.target.checked);
                }}
                className="mt-0.5"
              />
              <span className={milestone.isDone ? "text-muted line-through" : ""}>
                {milestone.title}
                <span className="ml-2 text-xs text-muted">{milestone.dueDate}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href={`/goals/${goal.id}`}
        className="mt-4 inline-flex text-sm font-semibold text-brand"
      >
        {t("edit")}
      </Link>
    </article>
  );
}
