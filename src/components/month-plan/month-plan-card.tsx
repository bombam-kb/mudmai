"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "next-intl";
import { type PillarId } from "@/lib/pillars";
import { PillarPicker } from "@/components/pillar-picker";
import { MobileFold } from "@/components/mobile-fold";
import { MonthPillarCoverage } from "@/components/month-plan/pillar-coverage";
import {
  MONTH_GOAL_MAX,
  MONTH_GOAL_TITLE_MAX,
  MONTH_IMPORTANT_MAX,
  emptyMonthPlan,
  type MonthGoalDto,
  type MonthPlanDto,
} from "@/lib/month-plan/schema";
import { monthGoalProgress } from "@/lib/month-plan/progress";
import { useMonthPlanStore } from "@/stores/month-plan-store";

type Props = {
  year: number;
  month: number;
  demoMode?: boolean;
  initialPlan?: MonthPlanDto | null;
};

type DragState = {
  id: string;
  from: number;
  over: number;
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  slots: number[];
};

const DRAG_THRESHOLD = 8;

function reorderGoals(goals: MonthGoalDto[], from: number, over: number) {
  if (from === over || from < 0 || over < 0 || over >= goals.length) return goals;
  const next = [...goals];
  const [item] = next.splice(from, 1);
  next.splice(over, 0, item);
  return next;
}

export function MonthPlanCard({
  year,
  month,
  demoMode,
  initialPlan = null,
}: Props) {
  const t = useTranslations("monthPlan");
  const tc = useTranslations("calendar");
  const stored = useMonthPlanStore((state) => state.plans);
  const [plan, setPlan] = useState(initialPlan ?? emptyMonthPlan(year, month));
  const [draft, setDraft] = useState("");
  const [draftPillar, setDraftPillar] = useState<PillarId>("PERSONAL");
  const [important, setImportant] = useState(initialPlan?.importantNote ?? "");
  const [error, setError] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const importantRef = useRef(important);
  const planRef = useRef(plan);
  const pendingRef = useRef(new Set<string>());
  const dragRef = useRef<DragState | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rafRef = useRef(0);
  const skipClickRef = useRef(false);
  const dirtyNoteRef = useRef(false);
  const dragListenersRef = useRef<{
    move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
  } | null>(null);
  planRef.current = plan;

  function applyPlan(next: MonthPlanDto) {
    setPlan(next);
    planRef.current = next;
    setImportant(next.importantNote);
    importantRef.current = next.importantNote;
    dirtyNoteRef.current = false;
  }

  useEffect(() => {
    if (!demoMode) return;
    applyPlan(useMonthPlanStore.getState().forMonth(year, month));
  }, [year, month, demoMode, stored]);

  useEffect(() => {
    if (demoMode) return;
    applyPlan(initialPlan ?? emptyMonthPlan(year, month));
  }, [year, month, demoMode, initialPlan]);

  useEffect(() => {
    if (demoMode) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/month-plan?year=${year}&month=${month}`, {
          signal: controller.signal,
        });
        const json = (await response.json().catch(() => null)) as
          | { ok?: boolean; plan?: MonthPlanDto }
          | null;
        if (!json?.ok || !json.plan) return;
        if (pendingRef.current.size > 0 || dirtyNoteRef.current) return;
        applyPlan(json.plan);
        useMonthPlanStore.getState().upsert(json.plan);
      } catch {
        /* keep SSR plan */
      }
    })();
    return () => controller.abort();
  }, [year, month, demoMode]);

  useEffect(() => {
    if (plan.goals.length > 1) return;
    setMovingId(null);
    setDrag(null);
    dragRef.current = null;
  }, [plan.goals.length]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const listeners = dragListenersRef.current;
      if (!listeners) return;
      window.removeEventListener("pointermove", listeners.move, true);
      window.removeEventListener("pointerup", listeners.up, true);
      window.removeEventListener("pointercancel", listeners.up, true);
      document.body.classList.remove("month-goal-dragging");
    };
  }, []);

  function markPending(id: string | undefined, on: boolean) {
    if (!id) return;
    if (on) pendingRef.current.add(id);
    else pendingRef.current.delete(id);
    setPendingIds([...pendingRef.current]);
  }

  async function persist(
    next: MonthPlanDto,
    options?: { pendingId?: string; optimistic?: boolean },
  ) {
    const previous = planRef.current;
    setError(false);
    if (options?.optimistic) {
      setPlan(next);
      planRef.current = next;
    }
    if (demoMode) {
      useMonthPlanStore.getState().upsert(next);
      setPlan(next);
      planRef.current = next;
      return true;
    }
    markPending(options?.pendingId, true);
    try {
      const response = await fetch("/api/month-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const json = (await response.json().catch(() => null)) as
        | { ok?: boolean; plan?: MonthPlanDto }
        | null;
      if (!response.ok || !json?.ok || !json.plan) throw new Error("save");
      applyPlan(json.plan);
      useMonthPlanStore.getState().upsert(json.plan);
      return true;
    } catch {
      if (options?.optimistic) {
        setPlan(previous);
        planRef.current = previous;
      }
      setError(true);
      return false;
    } finally {
      markPending(options?.pendingId, false);
    }
  }

  function withNote(goals: MonthGoalDto[]): MonthPlanDto {
    return {
      ...planRef.current,
      importantNote: important.trim(),
      goals,
    };
  }

  async function saveImportant() {
    const nextNote = important.trim();
    if (nextNote === importantRef.current) return;
    await persist({ ...planRef.current, importantNote: nextNote }, { pendingId: "important" });
  }

  async function addGoal() {
    const title = draft.trim();
    if (!title || planRef.current.goals.length >= MONTH_GOAL_MAX) return;
    if (pendingRef.current.has("add")) return;
    setDraft("");
    const ok = await persist(
      withNote([
        ...planRef.current.goals,
        {
          id: crypto.randomUUID(),
          title,
          isDone: false,
          pillar: draftPillar,
        },
      ]),
      { pendingId: "add" },
    );
    if (!ok) setDraft(title);
  }

  async function toggleGoal(goal: MonthGoalDto) {
    if (pendingRef.current.has(goal.id) || movingId || dragRef.current?.active) return;
    await persist(
      withNote(
        planRef.current.goals.map((item) =>
          item.id === goal.id ? { ...item, isDone: !item.isDone } : item,
        ),
      ),
      { pendingId: goal.id },
    );
  }

  async function setGoalPillar(goal: MonthGoalDto, pillar: PillarId | null) {
    if (pendingRef.current.has(goal.id)) return;
    await persist(
      withNote(
        planRef.current.goals.map((item) =>
          item.id === goal.id ? { ...item, pillar } : item,
        ),
      ),
      { pendingId: goal.id, optimistic: true },
    );
  }

  async function moveGoalTo(id: string, toIndex: number) {
    if (pendingRef.current.has(id)) return;
    const from = planRef.current.goals.findIndex((item) => item.id === id);
    const goals = reorderGoals(planRef.current.goals, from, toIndex);
    setMovingId(null);
    if (goals === planRef.current.goals) return;
    await persist(withNote(goals), { pendingId: id, optimistic: true });
  }

  async function removeGoal(id: string) {
    if (pendingRef.current.has(id)) return;
    if (movingId === id) setMovingId(null);
    await persist(
      withNote(planRef.current.goals.filter((item) => item.id !== id)),
      { pendingId: id },
    );
  }

  function indexFromY(clientY: number, slots: number[], fallback: number) {
    let over = fallback;
    for (let i = 0; i < slots.length; i++) {
      if (clientY < slots[i]) {
        over = i;
        break;
      }
      over = i;
    }
    return over;
  }

  function stopWindowDrag() {
    const listeners = dragListenersRef.current;
    dragListenersRef.current = null;
    if (listeners) {
      window.removeEventListener("pointermove", listeners.move, true);
      window.removeEventListener("pointerup", listeners.up, true);
      window.removeEventListener("pointercancel", listeners.up, true);
    }
    document.body.classList.remove("month-goal-dragging");
  }

  function onWindowPointerMove(event: PointerEvent) {
    const current = dragRef.current;
    if (!current || event.pointerId !== current.pointerId) return;
    current.x = event.clientX - current.offsetX;
    current.y = event.clientY - current.offsetY;
    const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);
    if (!current.active && distance >= DRAG_THRESHOLD) {
      current.active = true;
      document.body.classList.add("month-goal-dragging");
      setDrag({ ...current });
    }
    if (current.active) {
      event.preventDefault();
      if (listRef.current) {
        current.slots = [...listRef.current.querySelectorAll<HTMLElement>("[data-goal-id]")].map(
          (node) => {
            const box = node.getBoundingClientRect();
            return box.top + box.height / 2;
          },
        );
      }
      current.over = indexFromY(event.clientY, current.slots, current.over);
    }
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      if (dragRef.current) setDrag({ ...dragRef.current });
    });
  }

  function onWindowPointerUp(event: PointerEvent) {
    const current = dragRef.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const list = listRef.current;
    if (list?.hasPointerCapture(event.pointerId)) {
      list.releasePointerCapture(event.pointerId);
    }
    stopWindowDrag();
    dragRef.current = null;
    setDrag(null);
    if (!current.active) {
      setMovingId((id) => (id === current.id ? null : current.id));
      return;
    }
    skipClickRef.current = true;
    window.setTimeout(() => {
      skipClickRef.current = false;
    }, 0);
    void moveGoalTo(current.id, current.over);
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>, goal: MonthGoalDto) {
    if (event.button !== 0 || pendingRef.current.has(goal.id)) return;
    const from = planRef.current.goals.findIndex((item) => item.id === goal.id);
    const li = event.currentTarget.closest("li");
    if (!li || !listRef.current || from < 0) return;
    event.stopPropagation();
    const rect = li.getBoundingClientRect();
    const slots = [...listRef.current.querySelectorAll<HTMLElement>("[data-goal-id]")].map((node) => {
      const box = node.getBoundingClientRect();
      return box.top + box.height / 2;
    });
    const next: DragState = {
      id: goal.id,
      from,
      over: from,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      active: false,
      slots,
    };
    dragRef.current = next;
    setDrag(next);
    setMovingId(null);
    try {
      listRef.current.setPointerCapture(event.pointerId);
    } catch {
      /* capture is optional; window listeners still run */
    }
    window.addEventListener("pointermove", onWindowPointerMove, { capture: true, passive: false });
    window.addEventListener("pointerup", onWindowPointerUp, true);
    window.addEventListener("pointercancel", onWindowPointerUp, true);
    dragListenersRef.current = { move: onWindowPointerMove, up: onWindowPointerUp };
  }

  const progress = monthGoalProgress(plan.goals);
  const progressLabel =
    progress.percent >= 100
      ? t("progressDone", { percent: progress.percent })
      : t("progressNear", { percent: progress.percent });
  const adding = pendingIds.includes("add");
  const canMove = plan.goals.length > 1;
  const dragging = Boolean(drag?.active);
  const visibleGoals = useMemo(() => {
    if (!drag?.active) return plan.goals;
    return reorderGoals(plan.goals, drag.from, drag.over);
  }, [plan.goals, drag]);
  const draggedGoal = drag ? plan.goals.find((item) => item.id === drag.id) : null;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-personal">
            {t("eyebrow")}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl">
            {t("title", { month: tc(`months.${month}`), year })}
          </h2>
        </div>
        {progress.total > 0 ? (
          <p className="text-sm font-semibold text-muted">
            {t("stats", { completed: progress.completed, total: progress.total })}
          </p>
        ) : null}
      </div>

      {progress.total > 0 ? (
        <div className="mb-4 rounded-2xl bg-violet-50/80 px-4 py-3 ring-1 ring-violet-100">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="min-w-0 text-sm font-semibold text-ink">
              {progressLabel}
            </p>
            <p
              className={`shrink-0 font-display text-3xl leading-none ${
                progress.percent >= 100 ? "text-emerald-600" : "text-brand"
              }`}
            >
              {t("progressPercent", { percent: progress.percent })}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${
                progress.percent >= 100 ? "bg-emerald-500" : "bg-brand"
              }`}
              style={{ width: `${progress.percent}%` }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
              aria-label={progressLabel}
            />
          </div>
        </div>
      ) : null}

      <div className="month-plan-sections grid gap-6">
        <MobileFold
          title={t("important")}
          titleClassName="text-sm font-semibold text-ink"
          preview={
            important.trim() ? (
              <p className="line-clamp-2 text-sm text-muted">{important}</p>
            ) : (
              <p className="text-sm text-muted">{t("importantHint")}</p>
            )
          }
        >
          <p className="text-sm text-muted">{t("importantHint")}</p>
          <textarea
            aria-label={t("important")}
            value={important}
            onChange={(event) => {
              dirtyNoteRef.current = true;
              setImportant(event.target.value);
            }}
            onBlur={() => void saveImportant()}
            maxLength={MONTH_IMPORTANT_MAX}
            rows={4}
            placeholder={t("importantPlaceholder")}
            className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none ring-brand/30 focus:bg-white focus:ring-2"
          />
          <MonthPillarCoverage note={important} goals={plan.goals} />
        </MobileFold>

        <div className="border-t border-slate-100 pt-6">
          <MobileFold
            title={t("goals")}
            titleClassName="text-sm font-semibold text-ink"
            defaultOpen
            preview={
              plan.goals.length === 0 ? (
                <p className="text-sm text-muted">{t("emptyGoals")}</p>
              ) : (
                <p className="text-sm text-muted">{progressLabel}</p>
              )
            }
          >
          <p className="text-sm text-muted">{t("goalsHint")}</p>
          <form
            className="jr-composer mt-2"
            onSubmit={(event) => {
              event.preventDefault();
              void addGoal();
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("goalPlaceholder")}
              maxLength={MONTH_GOAL_TITLE_MAX}
              className="jr-composer-input min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none ring-brand/30 focus:bg-white focus:ring-2"
            />
            <PillarPicker
              value={draftPillar}
              disabled={adding}
              allowEmpty={false}
              size="field"
              onChange={(pillar) => {
                if (pillar) setDraftPillar(pillar);
              }}
            />
            <button
              type="submit"
              disabled={!draft.trim() || plan.goals.length >= MONTH_GOAL_MAX || adding}
              className="jr-composer-submit rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {adding ? t("saving") : t("add")}
            </button>
          </form>
          {movingId && canMove && !dragging ? (
            <p className="mt-2 text-xs font-semibold text-brand">{t("movingHint")}</p>
          ) : null}
          {plan.goals.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("emptyGoals")}</p>
          ) : (
            <ul ref={listRef} className={`month-goal-list mt-3 space-y-2 ${dragging ? "select-none" : ""}`}>
              {visibleGoals.map((goal, index) => {
                const pending = pendingIds.includes(goal.id);
                const moving = movingId === goal.id;
                const isPlaceholder = dragging && drag?.id === goal.id;
                return (
                  <li
                    key={goal.id}
                    data-goal-id={goal.id}
                    className={`month-goal-item rounded-2xl px-3 py-2.5 ring-1 ${
                      isPlaceholder
                        ? "month-goal-placeholder"
                        : pending
                          ? "todo-pending"
                          : moving
                            ? "ring-2 ring-brand"
                            : goal.isDone
                              ? "bg-slate-50 opacity-70 ring-slate-100"
                              : "bg-violet-50/70 ring-violet-100"
                    }`}
                    style={isPlaceholder ? { height: drag?.height } : undefined}
                    aria-busy={pending}
                    onClick={() => {
                      if (skipClickRef.current || dragging) return;
                      if (movingId && movingId !== goal.id) void moveGoalTo(movingId, index);
                    }}
                  >
                    {isPlaceholder ? null : (
                    <div className="month-goal-row">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                      {canMove ? (
                        <button
                          type="button"
                          disabled={pending}
                          aria-label={moving ? t("cancelMove") : t("move")}
                          aria-pressed={moving}
                          onPointerDown={(event) => startDrag(event, goal)}
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            setMovingId((id) => (id === goal.id ? null : goal.id));
                          }}
                          className="month-goal-handle grid h-8 w-8 shrink-0 cursor-grab place-items-center rounded-full bg-white text-muted ring-1 ring-slate-200 active:cursor-grabbing disabled:opacity-40"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                            <circle cx="5" cy="3" r="1.3" />
                            <circle cx="11" cy="3" r="1.3" />
                            <circle cx="5" cy="8" r="1.3" />
                            <circle cx="11" cy="8" r="1.3" />
                            <circle cx="5" cy="13" r="1.3" />
                            <circle cx="11" cy="13" r="1.3" />
                          </svg>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggleGoal(goal);
                        }}
                        disabled={pending || Boolean(movingId) || dragging}
                        aria-pressed={goal.isDone}
                        aria-label={pending ? t("saving") : t("done")}
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 text-[10px] font-bold ${
                          pending
                            ? "border-brand text-brand"
                            : goal.isDone
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300 bg-white text-white"
                        }`}
                      >
                        {pending ? (
                          <span className="todo-check-spin" />
                        ) : goal.isDone ? (
                          "✓"
                        ) : (
                          ""
                        )}
                      </button>
                      <p
                        className={`min-w-0 flex-1 text-sm font-semibold ${
                          goal.isDone ? "text-muted line-through" : "text-ink"
                        }`}
                      >
                        {goal.title}
                      </p>
                      </div>
                      <div
                        className="month-goal-actions"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <PillarPicker
                          value={goal.pillar}
                          disabled={pending}
                          onChange={(pillar) => void setGoalPillar(goal, pillar)}
                        />
                        <span className="h-5 w-px shrink-0 bg-slate-200" aria-hidden />
                        <button
                          type="button"
                          onClick={() => void removeGoal(goal.id)}
                          disabled={pending}
                          className="text-xs font-semibold text-muted hover:text-red-600 disabled:opacity-40"
                        >
                          {t("remove")}
                        </button>
                      </div>
                    </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          </MobileFold>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{t("error")}</p> : null}

      {drag?.active && draggedGoal ? (
        <div
          className="month-goal-ghost"
          style={{
            width: drag.width,
            ["--ghost-x" as string]: `${drag.x}px`,
            ["--ghost-y" as string]: `${drag.y}px`,
          }}
        >
          <p className="truncate text-sm font-semibold text-ink">{draggedGoal.title}</p>
        </div>
      ) : null}
    </section>
  );
}
