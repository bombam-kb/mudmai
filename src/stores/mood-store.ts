import { create } from "zustand";
import { persist } from "zustand/middleware";
import { scopedJsonStorage } from "@/lib/storage/scoped";
import type { MoodLevel } from "@/lib/mood/schema";

type MoodEntry = { date: string; level: MoodLevel };

type MoodState = {
  moods: MoodEntry[];
  setMood: (date: string, level: MoodLevel) => void;
  forDate: (date: string) => MoodLevel | null;
};

export const useMoodStore = create<MoodState>()(
  persist(
    (set, get) => ({
      moods: [],
      setMood: (date, level) =>
        set((state) => ({
          moods: [
            { date, level },
            ...state.moods.filter((item) => item.date !== date),
          ],
        })),
      forDate: (date) => get().moods.find((item) => item.date === date)?.level ?? null,
    }),
    { name: "jr-moods", storage: scopedJsonStorage },
  ),
);
