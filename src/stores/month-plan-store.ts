import { create } from "zustand";
import { persist } from "zustand/middleware";
import { scopedJsonStorage } from "@/lib/storage/scoped";
import { emptyMonthPlan, type MonthPlanDto } from "@/lib/month-plan/schema";

type MonthPlanState = {
  plans: MonthPlanDto[];
  upsert: (plan: MonthPlanDto) => void;
  forMonth: (year: number, month: number) => MonthPlanDto;
};

export const useMonthPlanStore = create<MonthPlanState>()(
  persist(
    (set, get) => ({
      plans: [],
      upsert: (plan) =>
        set((state) => {
          const exists = state.plans.some(
            (item) => item.year === plan.year && item.month === plan.month,
          );
          return {
            plans: exists
              ? state.plans.map((item) =>
                  item.year === plan.year && item.month === plan.month ? plan : item,
                )
              : [...state.plans, plan],
          };
        }),
      forMonth: (year, month) =>
        get().plans.find((item) => item.year === year && item.month === month) ??
        emptyMonthPlan(year, month),
    }),
    { name: "jr-month-plans", storage: scopedJsonStorage },
  ),
);
