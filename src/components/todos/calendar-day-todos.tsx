"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PencilIcon, PostponeIcon, TrashIcon, MoreIcon, PillarIcon } from "@/components/icons";
import {
  copyTodoToDate,
  inheritPillar,
  mergeYmdList,
  type GoalOption,
  type TodoDto,
  type TodoInput,
} from "@/lib/todos/schema";
import { inputToTodoDto, useTodosStore } from "@/stores/todos-store";
import { isYmd, localYmd, shiftYmd } from "@/lib/year";
import { PLAN } from "@/lib/billing/plan";

type SheetMode = "menu" | "edit" | "postpone" | "delete";

function defaultPostponeDate(from: string) {
  const tomorrow = shiftYmd(localYmd(), 1);
  return tomorrow === from ? shiftYmd(tomorrow, 1) : tomorrow;
}

type Props = {
  todos: TodoDto[];
  demoMode: boolean;
  goals?: GoalOption[];
  onTodosChange: (updater: (current: TodoDto[]) => TodoDto[]) => void;
};

export function CalendarDayTodos({
  todos,
  demoMode,
  goals = [],
  onTodosChange,
}: Props) {
  const tt = useTranslations("todos");
  const tc = useTranslations("calendar");
  const [activeTodo, setActiveTodo] = useState<TodoDto | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>("menu");
  const [draftTitle, setDraftTitle] = useState("");
  const [postponeDate, setPostponeDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sheetMode === "edit") titleRef.current?.focus();
  }, [sheetMode]);

  useEffect(() => {
    if (!activeTodo) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeSheet();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeTodo]);

  function closeSheet() {
    setActiveTodo(null);
    setSheetMode("menu");
    setError(false);
  }

  function openSheet(todo: TodoDto, mode: SheetMode = "menu") {
    setActiveTodo(todo);
    setSheetMode(mode);
    setDraftTitle(todo.title);
    setPostponeDate(defaultPostponeDate(todo.date));
    setError(false);
  }

  async function patchTodo(todo: TodoDto, partial: Partial<TodoInput>) {
    const nextGoalId = "goalId" in partial ? partial.goalId ?? null : todo.goalId;
    const completed = partial.isCompleted ?? todo.isCompleted;
    const next = inputToTodoDto(
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

    if (demoMode) {
      useTodosStore.getState().replace(next);
      onTodosChange((current) => current.map((item) => (item.id === todo.id ? next : item)));
      return true;
    }

    onTodosChange((current) => current.map((item) => (item.id === todo.id ? next : item)));
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      const json = (await response.json()) as { ok: boolean; todo?: TodoDto };
      if (!json.ok) throw new Error("patch");
      if (json.todo) {
        onTodosChange((current) =>
          current.map((item) => (item.id === todo.id ? json.todo! : item)),
        );
      }
      return true;
    } catch {
      onTodosChange((current) => current.map((item) => (item.id === todo.id ? todo : item)));
      setError(true);
      return false;
    }
  }

  async function removeTodo(todo: TodoDto) {
    if (demoMode) {
      useTodosStore.getState().remove(todo.id);
      onTodosChange((current) => current.filter((item) => item.id !== todo.id));
      return true;
    }
    onTodosChange((current) => current.filter((item) => item.id !== todo.id));
    const response = await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
    if (!response.ok) {
      onTodosChange((current) =>
        current.some((item) => item.id === todo.id) ? current : [...current, todo],
      );
      setError(true);
      return false;
    }
    return true;
  }

  async function postponeTodo(todo: TodoDto, dates: string[]) {
    const cleanDates = [...new Set(dates.filter((item) => isYmd(item) && item !== todo.date))];
    if (cleanDates.length === 0) return false;

    if (demoMode) {
      const postponedToDates = mergeYmdList(todo.postponedToDates, cleanDates);
      const original = inputToTodoDto(
        todo.id,
        { ...todo, isCompleted: false, postponedToDates },
        goals,
      );
      const stored = useTodosStore.getState().todos;
      for (const nextDate of cleanDates) {
        if (stored.filter((item) => item.date === nextDate).length >= PLAN.free.todosPerDay) {
          setError(true);
          return false;
        }
      }
      useTodosStore.getState().replace(original);
      onTodosChange((current) => current.map((item) => (item.id === todo.id ? original : item)));
      for (const nextDate of cleanDates) {
        useTodosStore.getState().upsert(
          inputToTodoDto(crypto.randomUUID(), copyTodoToDate(original, nextDate), goals),
        );
      }
      return true;
    }

    const response = await fetch(`/api/todos/${todo.id}/postpone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: todo.incompleteReason, dates: cleanDates }),
    });
    const json = (await response.json()) as {
      ok: boolean;
      todo?: TodoDto;
      copies?: TodoDto[];
      error?: string;
    };
    if (!json.ok || !json.todo) {
      setError(true);
      return false;
    }
    const copies = json.copies ?? [];
    onTodosChange((current) => [
      ...current.map((item) => (item.id === todo.id ? json.todo! : item)),
      ...copies.filter((copy) => !current.some((item) => item.id === copy.id)),
    ]);
    return true;
  }

  async function handleToggle(todo: TodoDto) {
    setBusy(true);
    await patchTodo(todo, { isCompleted: !todo.isCompleted });
    setBusy(false);
  }

  async function handleSaveEdit() {
    if (!activeTodo) return;
    const trimmed = draftTitle.trim();
    if (!trimmed || trimmed === activeTodo.title) {
      setSheetMode("menu");
      return;
    }
    setBusy(true);
    const ok = await patchTodo(activeTodo, { title: trimmed });
    setBusy(false);
    if (ok) closeSheet();
  }

  async function handlePostpone() {
    if (!activeTodo || !isYmd(postponeDate) || postponeDate === activeTodo.date) return;
    setBusy(true);
    const ok = await postponeTodo(activeTodo, [postponeDate]);
    setBusy(false);
    if (ok) closeSheet();
  }

  async function handleDelete() {
    if (!activeTodo) return;
    setBusy(true);
    const ok = await removeTodo(activeTodo);
    setBusy(false);
    if (ok) closeSheet();
  }

  return (
    <>
      <ul className="jr-day-items">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className={`jr-day-todo ${todo.isCompleted ? "is-done" : ""} ${busy ? "is-busy" : ""}`}
          >
            <button
              type="button"
              className={`jr-day-todo-check ${todo.isCompleted ? "is-on" : ""}`}
              aria-pressed={todo.isCompleted}
              aria-label={todo.isCompleted ? tt("done") : tt("checkHint")}
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation();
                void handleToggle(todo);
              }}
            >
              {todo.isCompleted ? "✓" : null}
            </button>
            <div className="jr-day-todo-main">
              {todo.pillar ? (
                <span className="jr-day-todo-pillar">
                  <PillarIcon id={todo.pillar} size={14} />
                </span>
              ) : null}
              <span className="jr-day-todo-title">{todo.title}</span>
            </div>
            <button
              type="button"
              className="jr-day-todo-more"
              aria-label={tc("actions")}
              title={tc("actions")}
              disabled={busy}
              onClick={() => openSheet(todo)}
            >
              <MoreIcon size={18} />
            </button>
          </li>
        ))}
      </ul>

      {activeTodo ? (
        <div className="jr-action-sheet-root" role="presentation">
          <button
            type="button"
            className="jr-action-sheet-backdrop"
            aria-label={tt("cancel")}
            onClick={closeSheet}
          />
          <div
            className="jr-action-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={tc("actionsTitle")}
          >
            <div className="jr-action-sheet-handle" aria-hidden />
            <p className="jr-action-sheet-title">{activeTodo.title}</p>

            {sheetMode === "menu" ? (
              <div className="jr-action-sheet-menu">
                <button
                  type="button"
                  className="jr-action-sheet-item"
                  disabled={busy || activeTodo.isCompleted}
                  onClick={() => setSheetMode("edit")}
                >
                  <PencilIcon size={18} />
                  <span>{tt("edit")}</span>
                </button>
                <button
                  type="button"
                  className="jr-action-sheet-item"
                  disabled={busy || activeTodo.isCompleted}
                  onClick={() => setSheetMode("postpone")}
                >
                  <PostponeIcon size={18} />
                  <span>{tt("postpone")}</span>
                </button>
                <button
                  type="button"
                  className="jr-action-sheet-item is-danger"
                  disabled={busy}
                  onClick={() => setSheetMode("delete")}
                >
                  <TrashIcon size={18} />
                  <span>{tt("delete")}</span>
                </button>
              </div>
            ) : null}

            {sheetMode === "edit" ? (
              <div className="jr-action-sheet-panel">
                <label className="block text-sm font-semibold text-muted">{tt("edit")}</label>
                <input
                  ref={titleRef}
                  value={draftTitle}
                  maxLength={200}
                  disabled={busy}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  className="jr-action-sheet-input"
                />
                <div className="jr-action-sheet-actions">
                  <button
                    type="button"
                    className="jr-action-sheet-btn"
                    disabled={busy}
                    onClick={() => setSheetMode("menu")}
                  >
                    {tt("cancel")}
                  </button>
                  <button
                    type="button"
                    className="jr-action-sheet-btn is-primary"
                    disabled={busy || !draftTitle.trim()}
                    onClick={() => void handleSaveEdit()}
                  >
                    {tt("edit")}
                  </button>
                </div>
              </div>
            ) : null}

            {sheetMode === "postpone" ? (
              <div className="jr-action-sheet-panel">
                <label className="block text-sm font-semibold text-muted">{tt("postponeDate")}</label>
                <input
                  type="date"
                  value={postponeDate}
                  disabled={busy}
                  onChange={(event) => setPostponeDate(event.target.value)}
                  className="jr-action-sheet-input"
                />
                <div className="jr-action-sheet-actions">
                  <button
                    type="button"
                    className="jr-action-sheet-btn"
                    disabled={busy}
                    onClick={() => setSheetMode("menu")}
                  >
                    {tt("cancel")}
                  </button>
                  <button
                    type="button"
                    className="jr-action-sheet-btn is-primary"
                    disabled={
                      busy || !isYmd(postponeDate) || postponeDate === activeTodo.date
                    }
                    onClick={() => void handlePostpone()}
                  >
                    {tt("postpone")}
                  </button>
                </div>
              </div>
            ) : null}

            {sheetMode === "delete" ? (
              <div className="jr-action-sheet-panel">
                <p className="text-sm font-semibold text-ink">{tt("deleteConfirm")}</p>
                <p className="mt-1 text-sm text-muted">
                  {tt("deleteConfirmBody", { title: activeTodo.title })}
                </p>
                <div className="jr-action-sheet-actions">
                  <button
                    type="button"
                    className="jr-action-sheet-btn"
                    disabled={busy}
                    onClick={() => setSheetMode("menu")}
                  >
                    {tt("cancel")}
                  </button>
                  <button
                    type="button"
                    className="jr-action-sheet-btn is-danger-solid"
                    disabled={busy}
                    onClick={() => void handleDelete()}
                  >
                    {tt("delete")}
                  </button>
                </div>
              </div>
            ) : null}

            {error ? <p className="jr-action-sheet-error">{tt("error")}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
