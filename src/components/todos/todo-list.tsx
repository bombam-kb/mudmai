"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { type PillarId } from "@/lib/pillars";
import { PencilIcon } from "@/components/icons";
import { PillarPicker } from "@/components/pillar-picker";
import {
  copyTodoToDate,
  inheritPillar,
  mergeYmdList,
  normalizeTodo,
  todoStats,
  type GoalOption,
  type TodoDto,
  type TodoInput,
} from "@/lib/todos/schema";
import { inputToTodoDto, useTodosStore } from "@/stores/todos-store";
import { isYmd, localYmd, shiftYmd } from "@/lib/year";
import { DayCompleteBurst } from "@/components/todos/day-complete";
import { MobileFold } from "@/components/mobile-fold";
import { PLAN } from "@/lib/billing/plan";

type Props = {
  date: string;
  demoMode: boolean;
  goals: GoalOption[];
  initialTodos: TodoDto[];
  compact?: boolean;
  featured?: boolean;
  emptyText?: string;
  placeholder?: string;
  onTodosChange?: (todos: TodoDto[]) => void;
};

function defaultPostponeDate(from: string) {
  const tomorrow = shiftYmd(localYmd(), 1);
  return tomorrow === from ? shiftYmd(tomorrow, 1) : tomorrow;
}

export function TodoList({
  date,
  demoMode,
  goals,
  initialTodos,
  compact,
  featured,
  emptyText,
  placeholder,
  onTodosChange,
}: Props) {
  const t = useTranslations("todos");
  const stored = useTodosStore((state) => state.todos);
  const [todos, setTodos] = useState(initialTodos);
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState("");
  const [draftPillar, setDraftPillar] = useState<PillarId>("PERSONAL");
  const [error, setError] = useState(false);
  const [quotaError, setQuotaError] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const patchGen = useRef(new Map<string, number>());

  useEffect(() => {
    setTodos(initialTodos);
  }, [initialTodos, date]);

  const source = (demoMode ? stored : todos)
    .map(normalizeTodo)
    .filter((todo) => todo.date === date);
  const ordered = useMemo(
    () =>
      [...source].sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted)),
    [source],
  );
  const stats = todoStats(ordered);
  const openTodos = ordered.filter((todo) => !todo.isCompleted);
  const doneTodos = ordered.filter((todo) => todo.isCompleted);
  const todoQuotaUsed = source.length;
  const todoQuotaFull = todoQuotaUsed >= PLAN.free.todosPerDay;

  function maybeCelebrate(todoId: string, nextCompleted: boolean) {
    if (!nextCompleted || ordered.length === 0) return;
    const allDone = ordered.every((item) =>
      item.id === todoId ? true : item.isCompleted,
    );
    if (allDone) {
      setCelebrate(true);
      setCelebrateKey((key) => key + 1);
    }
  }

  function applyTodos(updater: (current: TodoDto[]) => TodoDto[]) {
    setTodos((current) => {
      const next = updater(current);
      onTodosChange?.(next);
      return next;
    });
  }

  async function createTodo() {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (todoQuotaFull) {
      setQuotaError(true);
      return;
    }
    setError(false);
    setQuotaError(false);
    const input: TodoInput = {
      date,
      title: trimmed,
      isCompleted: false,
      goalId: goalId || null,
      pillar: inheritPillar(goalId || null, draftPillar, goals),
      incompleteReason: null,
      postponedToDates: [],
      sourceTodoId: null,
      carriedFromDate: null,
    };
    const tempId = crypto.randomUUID();
    const optimistic = inputToTodoDto(tempId, input, goals);
    setTitle("");
    setGoalId("");
    setDraftPillar("PERSONAL");
    if (demoMode) {
      useTodosStore.getState().upsert(optimistic);
      return;
    }
    applyTodos((current) => [...current, optimistic]);
    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = (await response.json()) as {
        ok: boolean;
        todo?: TodoDto;
        error?: string;
      };
      if (json.error === "todo_quota") {
        applyTodos((current) => current.filter((item) => item.id !== tempId));
        setQuotaError(true);
        setTitle(trimmed);
        return;
      }
      if (!json.ok || !json.todo) throw new Error("create");
      applyTodos((current) =>
        current.map((item) => (item.id === tempId ? json.todo! : item)),
      );
    } catch {
      applyTodos((current) => current.filter((item) => item.id !== tempId));
      setTitle(trimmed);
      setError(true);
    }
  }

  async function patchTodo(todo: TodoDto, partial: Partial<TodoInput>) {
    const nextGoalId = "goalId" in partial ? partial.goalId ?? null : todo.goalId;
    const completed = partial.isCompleted ?? todo.isCompleted;
    const next: TodoDto = inputToTodoDto(
      todo.id,
      {
        date: partial.date ?? todo.date,
        title: partial.title ?? todo.title,
        isCompleted: completed,
        goalId: nextGoalId,
        pillar: inheritPillar(nextGoalId, partial.pillar ?? todo.pillar, goals),
        incompleteReason: completed
          ? null
          : "incompleteReason" in partial
            ? partial.incompleteReason ?? null
            : todo.incompleteReason,
        postponedToDates: partial.postponedToDates ?? todo.postponedToDates,
        sourceTodoId: todo.sourceTodoId,
        carriedFromDate: todo.carriedFromDate,
      },
      goals,
    );
    maybeCelebrate(todo.id, completed && !todo.isCompleted);
    if (demoMode) {
      useTodosStore.getState().replace(next);
      return;
    }
    const gen = (patchGen.current.get(todo.id) ?? 0) + 1;
    patchGen.current.set(todo.id, gen);
    applyTodos((current) =>
      current.map((item) => (item.id === todo.id ? next : item)),
    );
    setError(false);
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      const json = (await response.json()) as { ok: boolean; todo?: TodoDto };
      if (patchGen.current.get(todo.id) !== gen) return;
      if (!json.ok) throw new Error("patch");
      if (json.todo) {
        applyTodos((current) =>
          current.map((item) => (item.id === todo.id ? json.todo! : item)),
        );
      }
    } catch {
      if (patchGen.current.get(todo.id) !== gen) return;
      applyTodos((current) =>
        current.map((item) => (item.id === todo.id ? todo : item)),
      );
      setError(true);
    }
  }

  async function postponeTodo(todo: TodoDto, reason: string, dates: string[]) {
    const cleanDates = [...new Set(dates.filter((item) => isYmd(item) && item !== todo.date))];
    if (cleanDates.length === 0) return;
    setError(false);
    setQuotaError(false);
    if (demoMode) {
      const postponedToDates = mergeYmdList(todo.postponedToDates, cleanDates);
      const original = inputToTodoDto(
        todo.id,
        {
          ...todo,
          isCompleted: false,
          incompleteReason: reason.trim() || todo.incompleteReason,
          postponedToDates,
        },
        goals,
      );
      const stored = useTodosStore.getState().todos;
      for (const nextDate of cleanDates) {
        const used = stored.filter((item) => item.date === nextDate).length;
        if (used >= PLAN.free.todosPerDay) {
          setQuotaError(true);
          return;
        }
      }
      useTodosStore.getState().replace(original);
      const nextStored = useTodosStore.getState().todos;
      for (const nextDate of cleanDates) {
        if (nextStored.some((item) => item.sourceTodoId === todo.id && item.date === nextDate)) {
          continue;
        }
        useTodosStore.getState().upsert(
          inputToTodoDto(crypto.randomUUID(), copyTodoToDate(original, nextDate), goals),
        );
      }
      return;
    }
    const response = await fetch(`/api/todos/${todo.id}/postpone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, dates: cleanDates }),
    });
    const json = (await response.json()) as {
      ok: boolean;
      todo?: TodoDto;
      copies?: TodoDto[];
      error?: string;
    };
    if (json.error === "todo_quota") {
      setQuotaError(true);
      return;
    }
    if (!json.ok || !json.todo) {
      setError(true);
      return;
    }
    const copies = json.copies ?? [];
    applyTodos((current) => [
      ...current.map((item) => (item.id === todo.id ? json.todo! : item)),
      ...copies.filter((copy) => !current.some((item) => item.id === copy.id)),
    ]);
  }

  async function removeTodo(todo: TodoDto) {
    if (demoMode) {
      useTodosStore.getState().remove(todo.id);
      return;
    }
    applyTodos((current) => current.filter((item) => item.id !== todo.id));
    const response = await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
    if (!response.ok) {
      applyTodos((current) =>
        current.some((item) => item.id === todo.id) ? current : [...current, todo],
      );
      setError(true);
    }
  }

  return (
    <div>
      {celebrate ? (
        <DayCompleteBurst
          key={celebrateKey}
          demoMode={demoMode}
          onDone={() => setCelebrate(false)}
        />
      ) : null}
      {!featured ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="font-semibold text-muted">
            {t("stats", { completed: stats.completed, total: stats.total })}
          </p>
        </div>
      ) : null}

      <p className={`mb-2 text-xs font-semibold ${todoQuotaFull ? "text-personal" : "text-muted"}`}>
        {todoQuotaFull
          ? t("quotaFull", { limit: PLAN.free.todosPerDay })
          : t("quotaHint", { used: todoQuotaUsed, limit: PLAN.free.todosPerDay })}
      </p>

      <form
        className="jr-composer mb-4"
        onSubmit={(event) => {
          event.preventDefault();
          void createTodo();
        }}
      >
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={placeholder ?? t("placeholder")}
          className={`jr-composer-input min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-brand/30 focus:ring-2 ${
            featured ? "py-3.5 text-base shadow-sm" : "py-2.5"
          }`}
          maxLength={200}
        />
        <PillarPicker
          value={draftPillar}
          allowEmpty={false}
          size={featured ? "featured" : "field"}
          tone="plain"
          onChange={(pillar) => {
            if (pillar) setDraftPillar(pillar);
          }}
        />
        <select
          value={goalId}
          onChange={(event) => {
            const next = event.target.value;
            setGoalId(next);
            const linked = goals.find((goal) => goal.id === next);
            if (linked) setDraftPillar(linked.pillar);
          }}
          className={`jr-composer-extra rounded-2xl border border-slate-200 bg-white px-3 text-sm text-muted ${
            featured ? "py-3.5" : "py-2.5"
          }`}
          aria-label={t("linkGoal")}
        >
          <option value="">{t("linkGoal")}</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.title}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!title.trim() || todoQuotaFull}
          className={`jr-composer-submit rounded-full bg-brand text-sm font-semibold text-white disabled:opacity-50 ${
            featured ? "px-5 py-3.5" : "px-4 py-2.5"
          }`}
        >
          {t("add")}
        </button>
      </form>

      {quotaError ? (
        <p className="mb-3 text-sm text-red-600">
          {t("quotaError", { limit: PLAN.free.todosPerDay })}
        </p>
      ) : null}
      {error ? <p className="mb-3 text-sm text-red-600">{t("error")}</p> : null}

      {ordered.length === 0 ? (
        <p className="text-sm text-muted">{emptyText ?? t("empty")}</p>
      ) : (
        <div className="space-y-3">
          {openTodos.length > 0 ? (
            <ul className="space-y-2">
              {openTodos.map((todo, index) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  goals={goals}
                  compact={compact}
                  hint={index === 0}
                  onToggle={() =>
                    void patchTodo(todo, { isCompleted: !todo.isCompleted })
                  }
                  onGoal={(nextGoalId) => {
                    const linked = nextGoalId
                      ? goals.find((goal) => goal.id === nextGoalId)
                      : null;
                    void patchTodo(todo, {
                      goalId: nextGoalId,
                      pillar: linked?.pillar ?? todo.pillar ?? "PERSONAL",
                    });
                  }}
                  onPillar={(pillar) => void patchTodo(todo, { pillar })}
                  onReason={(incompleteReason) =>
                    void patchTodo(todo, { incompleteReason })
                  }
                  onTitle={(title) => void patchTodo(todo, { title })}
                  onPostpone={(reason, dates) => void postponeTodo(todo, reason, dates)}
                  onDelete={() => void removeTodo(todo)}
                />
              ))}
            </ul>
          ) : null}
          {doneTodos.length > 0 ? (
            <MobileFold
              title={t("completedFold", { count: doneTodos.length })}
              titleClassName="text-sm font-semibold text-muted"
              defaultOpen={openTodos.length === 0}
            >
              <ul className="space-y-2">
                {doneTodos.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    goals={goals}
                    compact={compact}
                    onToggle={() =>
                      void patchTodo(todo, { isCompleted: !todo.isCompleted })
                    }
                    onGoal={(nextGoalId) => {
                      const linked = nextGoalId
                        ? goals.find((goal) => goal.id === nextGoalId)
                        : null;
                      void patchTodo(todo, {
                        goalId: nextGoalId,
                        pillar: linked?.pillar ?? todo.pillar ?? "PERSONAL",
                      });
                    }}
                    onPillar={(pillar) => void patchTodo(todo, { pillar })}
                    onReason={(incompleteReason) =>
                      void patchTodo(todo, { incompleteReason })
                    }
                    onTitle={(title) => void patchTodo(todo, { title })}
                    onPostpone={(reason, dates) => void postponeTodo(todo, reason, dates)}
                    onDelete={() => void removeTodo(todo)}
                  />
                ))}
              </ul>
            </MobileFold>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TodoRow({
  todo,
  goals,
  compact,
  hint,
  pending,
  onToggle,
  onGoal,
  onPillar,
  onReason,
  onTitle,
  onPostpone,
  onDelete,
}: {
  todo: TodoDto;
  goals: GoalOption[];
  compact?: boolean;
  hint?: boolean;
  pending?: boolean;
  onToggle: () => void;
  onGoal: (goalId: string | null) => void;
  onPillar: (pillar: PillarId | null) => void;
  onReason: (reason: string | null) => void;
  onTitle: (title: string) => void;
  onPostpone: (reason: string, dates: string[]) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("todos");
  const logged = !todo.isCompleted && Boolean(todo.incompleteReason || todo.postponedToDates.length);
  const [open, setOpen] = useState(logged);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const showPanel = !todo.isCompleted && (!compact || logged || open);
  const locked = Boolean(pending || editing || confirmDelete);

  useEffect(() => {
    setDraft(todo.title);
  }, [todo.id, todo.title]);

  useEffect(() => {
    if (editing) titleRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!confirmDelete) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirmDelete(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmDelete]);

  function startEdit() {
    if (pending || todo.isCompleted) return;
    setConfirmDelete(false);
    setDraft(todo.title);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(todo.title);
    setEditing(false);
  }

  function commitEdit() {
    if (!editing) return;
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed) {
      setDraft(todo.title);
      return;
    }
    if (trimmed === todo.title) return;
    onTitle(trimmed);
  }

  function onCardClick(event: MouseEvent<HTMLElement>) {
    if (locked) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, select, textarea, input, a, label")) return;
    onToggle();
  }

  return (
    <li
      className={`todo-card group relative rounded-2xl px-3 py-3 ring-1 transition ${
        pending ? "todo-pending" : ""
      } ${locked ? "todo-editing" : ""} ${
        todo.isCompleted
          ? "todo-done bg-slate-50 opacity-70 ring-slate-100"
          : logged
            ? "bg-amber-50/80 ring-amber-100 hover:ring-brand/40"
            : hint
              ? "todo-card-hint bg-white ring-transparent"
              : "bg-slate-50 ring-slate-100 hover:ring-brand/40"
      }`}
      aria-busy={pending}
      onClick={onCardClick}
    >
      <div className="todo-row">
        <button
          type="button"
          onClick={onToggle}
          disabled={pending || editing}
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${
            pending
              ? "border-brand text-brand"
              : todo.isCompleted
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-slate-300 bg-white"
          }`}
          aria-pressed={todo.isCompleted}
          aria-label={pending ? t("saving") : t("done")}
        >
          {pending ? (
            <span className="todo-check-spin" />
          ) : todo.isCompleted ? (
            "✓"
          ) : (
            ""
          )}
        </button>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={titleRef}
              value={draft}
              maxLength={200}
              disabled={pending}
              aria-label={t("edit")}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitEdit}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitEdit();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelEdit();
                }
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold text-ink outline-none ring-brand/30 focus:ring-2"
            />
          ) : (
            <div className="flex min-h-6 items-center gap-1.5">
              <p
                className={`min-w-0 text-sm font-semibold leading-6 ${
                  todo.isCompleted ? "text-muted line-through" : "text-ink"
                }`}
              >
                {todo.title}
              </p>
              {!todo.isCompleted ? (
                <span className="group/edit relative inline-flex shrink-0">
                  <button
                    type="button"
                    onClick={startEdit}
                    disabled={pending}
                    aria-label={t("edit")}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-400 text-amber-500 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40"
                  >
                    <PencilIcon size={13} />
                  </button>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-semibold text-amber-950 opacity-0 shadow-sm transition group-hover/edit:opacity-100 group-focus-within/edit:opacity-100"
                  >
                    {t("edit")}
                  </span>
                </span>
              ) : null}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {todo.goalId || todo.goalTitle ? (
              !compact ? (
                <select
                  value={todo.goalId ?? ""}
                  onChange={(event) => onGoal(event.target.value || null)}
                  className="max-w-[14rem] rounded-full bg-white px-2 py-0.5 text-xs text-muted ring-1 ring-slate-200"
                >
                  <option value="">{t("unlink")}</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="truncate text-xs text-muted">{todo.goalTitle}</span>
              )
            ) : null}
            {todo.carriedFromDate ? (
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-personal ring-1 ring-violet-100">
                {t("carriedFrom", { date: todo.carriedFromDate })}
              </span>
            ) : null}
          </div>
        </div>
        <div className="todo-row-actions">
          <PillarPicker
            value={todo.pillar}
            disabled={pending || editing}
            allowEmpty={false}
            onChange={(pillar) => onPillar(pillar ?? "PERSONAL")}
          />
          <span className="h-5 w-px shrink-0 bg-slate-200" aria-hidden />
          <button
            type="button"
            onClick={() => {
              cancelEdit();
              setConfirmDelete(true);
            }}
            disabled={pending}
            className="text-xs font-semibold text-muted hover:text-red-600 disabled:opacity-40"
          >
            {t("delete")}
          </button>
        </div>
      </div>
      {confirmDelete ? (
        <div className="relative z-10 mt-3 rounded-2xl bg-rose-50 px-3 py-3 ring-1 ring-rose-100">
          <p className="text-sm font-semibold text-ink">{t("deleteConfirm")}</p>
          <p className="mt-1 text-xs text-muted">{t("deleteConfirmBody", { title: todo.title })}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-slate-200"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              {t("delete")}
            </button>
          </div>
        </div>
      ) : null}
      {!todo.isCompleted && !pending && !editing && !confirmDelete ? (
        <p className="todo-check-hint" aria-hidden>
          <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
            ✓
          </span>
          {t("checkHint")}
        </p>
      ) : null}
      {!todo.isCompleted && compact && !showPanel ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative z-10 mt-2 ml-9 text-xs font-semibold text-brand"
        >
          {t("markIncomplete")}
        </button>
      ) : null}
      {showPanel && !confirmDelete ? (
        <div className="relative z-10">
          <IncompletePanel todo={todo} compact={compact} onReason={onReason} onPostpone={onPostpone} />
        </div>
      ) : null}
    </li>
  );
}

function IncompletePanel({
  todo,
  compact,
  onReason,
  onPostpone,
}: {
  todo: TodoDto;
  compact?: boolean;
  onReason: (reason: string | null) => void;
  onPostpone: (reason: string, dates: string[]) => void;
}) {
  const t = useTranslations("todos");
  const [reason, setReason] = useState(todo.incompleteReason ?? "");
  const [date, setDate] = useState(defaultPostponeDate(todo.date));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setReason(todo.incompleteReason ?? "");
  }, [todo.id, todo.incompleteReason]);

  function saveReason() {
    const next = reason.trim() || null;
    if (next === (todo.incompleteReason ?? null)) return;
    onReason(next);
  }

  return (
    <div className={`mt-3 space-y-2 ${compact ? "pl-9" : "pl-9"}`}>
      <label className="block">
        <span className="text-xs font-semibold text-muted">{t("incompleteReason")}</span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          onBlur={saveReason}
          rows={compact ? 2 : 3}
          maxLength={400}
          placeholder={t("incompleteReasonHint")}
          className="mt-1 w-full rounded-2xl border border-amber-100 bg-white px-3 py-2 text-sm outline-none ring-brand/30 placeholder:text-slate-400 focus:ring-2"
        />
      </label>
      {todo.postponedToDates.length > 0 ? (
        <p className="text-xs font-semibold text-personal">
          {t("postponedTo", { dates: todo.postponedToDates.join(", ") })}
        </p>
      ) : (
        <p className="text-xs text-muted">{t("keepLogHint")}</p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-muted">
          {t("postponeDate")}
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 block rounded-full bg-white px-3 py-1.5 text-sm font-medium text-ink ring-1 ring-slate-200"
          />
        </label>
        <button
          type="button"
          disabled={busy || !isYmd(date) || date === todo.date}
          onClick={() => {
            setBusy(true);
            onPostpone(reason, [date]);
            setDate(defaultPostponeDate(todo.date));
            window.setTimeout(() => setBusy(false), 400);
          }}
          className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {t("postpone")}
        </button>
      </div>
    </div>
  );
}
