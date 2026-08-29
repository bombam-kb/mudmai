import { create } from "zustand";
import { persist } from "zustand/middleware";
import { scopedJsonStorage } from "@/lib/storage/scoped";
import { generateNudgeTextSync } from "@/lib/nudge/generate";
import {
  detectPendingNudges,
  type NudgeDto,
  type NudgeReflection,
} from "@/lib/nudge/schema";
import type { OnboardingRatings } from "@/lib/onboarding/schema";

type NudgeState = {
  nudges: NudgeDto[];
  add: (nudge: NudgeDto) => void;
  markRead: (id: string) => void;
  evaluateDemo: (input: {
    locale: "th" | "en";
    reflection: NudgeReflection | null;
    monthly: { year: number; month: number; ratings: OnboardingRatings } | null;
    weekTodos: { isCompleted: boolean }[];
    weekFrom: string;
    weekTo: string;
  }) => NudgeDto[];
};

export const useNudgeStore = create<NudgeState>()(
  persist(
    (set, get) => ({
      nudges: [],
      add: (nudge) =>
        set((state) => ({
          nudges: [nudge, ...state.nudges.filter((item) => item.id !== nudge.id)],
        })),
      markRead: (id) =>
        set((state) => ({
          nudges: state.nudges.map((item) =>
            item.id === id ? { ...item, isRead: true } : item,
          ),
        })),
      evaluateDemo: (input) => {
        const pending = detectPendingNudges({
          ...input,
          existing: get().nudges,
        });
        const created: NudgeDto[] = pending.map((item) => ({
          id: crypto.randomUUID(),
          triggerReason: item.triggerReason,
          nudgeText: generateNudgeTextSync(
            item.triggerReason,
            input.locale,
            item.contextUsed,
          ),
          contextUsed: item.contextUsed,
          isRead: false,
          createdAt: new Date().toISOString(),
        }));
        if (created.length) {
          set((state) => ({ nudges: [...created, ...state.nudges] }));
        }
        return created;
      },
    }),
    { name: "jr-nudges", storage: scopedJsonStorage },
  ),
);
