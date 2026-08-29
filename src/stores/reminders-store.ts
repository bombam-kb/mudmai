import { create } from "zustand";
import { persist } from "zustand/middleware";
import { scopedJsonStorage } from "@/lib/storage/scoped";
import {
  DEFAULT_PREFS,
  mergePrefs,
  type ReminderLogDto,
  type ReminderPrefDto,
} from "@/lib/reminders/schema";

type RemindersState = {
  prefs: ReminderPrefDto[];
  logs: ReminderLogDto[];
  setPref: (pref: ReminderPrefDto) => void;
  replacePrefs: (prefs: ReminderPrefDto[]) => void;
  addLog: (log: ReminderLogDto) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

export const useRemindersStore = create<RemindersState>()(
  persist(
    (set) => ({
      prefs: DEFAULT_PREFS,
      logs: [],
      setPref: (pref) =>
        set((state) => ({
          prefs: mergePrefs(
            state.prefs.map((item) => (item.cadence === pref.cadence ? pref : item)),
          ),
        })),
      replacePrefs: (prefs) => set({ prefs: mergePrefs(prefs) }),
      addLog: (log) =>
        set((state) => ({
          logs: [log, ...state.logs.filter((item) => item.id !== log.id)],
          prefs: state.prefs.map((pref) =>
            pref.cadence === log.cadence ? { ...pref, lastSentAt: log.sentAt } : pref,
          ),
        })),
      markRead: (id) =>
        set((state) => ({
          logs: state.logs.map((log) => (log.id === id ? { ...log, isRead: true } : log)),
        })),
      markAllRead: () =>
        set((state) => ({
          logs: state.logs.map((log) => ({ ...log, isRead: true })),
        })),
    }),
    { name: "jr-reminders", storage: scopedJsonStorage },
  ),
);
