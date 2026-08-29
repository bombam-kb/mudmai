import { create } from "zustand";
import { persist } from "zustand/middleware";
import { scopedJsonStorage } from "@/lib/storage/scoped";
import type { GoalOption, TodoDto, TodoInput } from "@/lib/todos/schema";
import { goalTitleFor, inheritPillar, readYmdList } from "@/lib/todos/schema";

type TodosState = {
  todos: TodoDto[];
  upsert: (todo: TodoDto) => void;
  replace: (todo: TodoDto) => void;
  remove: (id: string) => void;
};

export function inputToTodoDto(
  id: string,
  input: TodoInput,
  goals: GoalOption[],
): TodoDto {
  const pillar = inheritPillar(input.goalId, input.pillar, goals);
  return {
    id,
    date: input.date,
    title: input.title,
    isCompleted: input.isCompleted,
    goalId: input.goalId,
    pillar,
    goalTitle: goalTitleFor(input.goalId, goals),
    incompleteReason: input.incompleteReason?.trim() || null,
    postponedToDates: readYmdList(input.postponedToDates),
    sourceTodoId: input.sourceTodoId ?? null,
    carriedFromDate: input.carriedFromDate ?? null,
  };
}

export const useTodosStore = create<TodosState>()(
  persist(
    (set) => ({
      todos: [],
      upsert: (todo) =>
        set((state) => {
          const exists = state.todos.some((item) => item.id === todo.id);
          return {
            todos: exists
              ? state.todos.map((item) => (item.id === todo.id ? todo : item))
              : [...state.todos, todo],
          };
        }),
      replace: (todo) =>
        set((state) => ({
          todos: state.todos.map((item) => (item.id === todo.id ? todo : item)),
        })),
      remove: (id) =>
        set((state) => ({
          todos: state.todos.filter((item) => item.id !== id),
        })),
    }),
    { name: "jr-todos", storage: scopedJsonStorage },
  ),
);
