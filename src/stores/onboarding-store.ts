import { create } from "zustand";
import { persist } from "zustand/middleware";
import { scopedJsonStorage } from "@/lib/storage/scoped";
import {
  EMPTY_DRAFT,
  type OnboardingDraft,
  type OnboardingTextField,
} from "@/lib/onboarding/schema";
import type { PillarId } from "@/lib/pillars";

type OnboardingState = OnboardingDraft & {
  step: number;
  completed: boolean;
  hydratedFromServer: boolean;
  setStep: (step: number) => void;
  setText: (field: OnboardingTextField, value: string) => void;
  setRating: (pillar: PillarId, value: number) => void;
  hydrate: (draft: OnboardingDraft) => void;
  markCompleted: () => void;
  reset: () => void;
};

export const TOTAL_STEPS = 7;

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...EMPTY_DRAFT,
      step: 0,
      completed: false,
      hydratedFromServer: false,
      setStep: (step) => set({ step }),
      setText: (field, value) => set({ [field]: value }),
      setRating: (pillar, value) =>
        set((state) => ({
          ratings: { ...state.ratings, [pillar]: value },
        })),
      hydrate: (draft) => set({ ...draft, hydratedFromServer: true }),
      markCompleted: () => set({ completed: true }),
      reset: () =>
        set({ ...EMPTY_DRAFT, step: 0, completed: false, hydratedFromServer: false }),
    }),
    {
      name: "jr-onboarding-draft",
      storage: scopedJsonStorage,
      partialize: (state) => ({
        step: state.step,
        completed: state.completed,
        lastYearStory: state.lastYearStory,
        happiestMoment: state.happiestMoment,
        keyLearnings: state.keyLearnings,
        healingThings: state.healingThings,
        expectationsNextYear: state.expectationsNextYear,
        ratings: state.ratings,
      }),
    },
  ),
);
