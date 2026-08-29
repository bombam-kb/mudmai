import { create } from "zustand";
import { persist } from "zustand/middleware";
import { scopedJsonStorage } from "@/lib/storage/scoped";
import type { GoalDto, GoalInput } from "@/lib/goals/schema";
import { goalProgressPercent } from "@/lib/pillars";

type GoalsState = {
  goals: GoalDto[];
  upsert: (goal: GoalDto) => void;
  remove: (id: string) => void;
  replace: (goal: GoalDto) => void;
};

export function inputToDto(id: string, input: GoalInput): GoalDto {
  return {
    ...input,
    id,
    progress: goalProgressPercent(input.currentValue, input.targetValue),
    milestones: input.milestones.map((milestone, index) => ({
      id: milestone.id ?? crypto.randomUUID(),
      title: milestone.title,
      dueDate: milestone.dueDate,
      isDone: milestone.isDone,
      order: milestone.order ?? index,
    })),
  };
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set) => ({
      goals: [],
      upsert: (goal) =>
        set((state) => {
          const exists = state.goals.some((item) => item.id === goal.id);
          return {
            goals: exists
              ? state.goals.map((item) => (item.id === goal.id ? goal : item))
              : [...state.goals, goal],
          };
        }),
      replace: (goal) =>
        set((state) => ({
          goals: state.goals.map((item) => (item.id === goal.id ? goal : item)),
        })),
      remove: (id) =>
        set((state) => ({ goals: state.goals.filter((item) => item.id !== id) })),
    }),
    { name: "jr-goals", storage: scopedJsonStorage },
  ),
);
