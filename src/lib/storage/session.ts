import { EMPTY_DRAFT } from "@/lib/onboarding/schema";
import { DEFAULT_PREFS } from "@/lib/reminders/schema";
import {
  clearJourneyLocalKeys,
  readClientOwner,
  writeClientOwner,
} from "@/lib/storage/scoped";
import { useGoalsStore } from "@/stores/goals-store";
import { useMonthPlanStore } from "@/stores/month-plan-store";
import { useMoodStore } from "@/stores/mood-store";
import { useNudgeStore } from "@/stores/nudge-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useRemindersStore } from "@/stores/reminders-store";
import { useReviewsStore } from "@/stores/reviews-store";
import { useTodosStore } from "@/stores/todos-store";

function persistApis() {
  return [
    useGoalsStore.persist,
    useMonthPlanStore.persist,
    useMoodStore.persist,
    useNudgeStore.persist,
    useOnboardingStore.persist,
    useRemindersStore.persist,
    useReviewsStore.persist,
    useTodosStore.persist,
  ];
}

function resetStoreMemory() {
  useGoalsStore.setState({ goals: [] });
  useMonthPlanStore.setState({ plans: [] });
  useMoodStore.setState({ moods: [] });
  useNudgeStore.setState({ nudges: [] });
  useOnboardingStore.setState({
    ...EMPTY_DRAFT,
    step: 0,
    completed: false,
    hydratedFromServer: false,
  });
  useRemindersStore.setState({ prefs: DEFAULT_PREFS, logs: [] });
  useReviewsStore.setState({ monthly: [], quarterly: [] });
  useTodosStore.setState({ todos: [] });
}

export async function bindClientOwner(ownerId: string) {
  if (typeof window === "undefined") return;
  const next = ownerId.trim() || "demo";
  if (readClientOwner() === next) return;
  writeClientOwner(next);
  resetStoreMemory();
  await Promise.all(persistApis().map((api) => api.rehydrate()));
}

export function clearJourneyClientData() {
  clearJourneyLocalKeys();
  resetStoreMemory();
}
