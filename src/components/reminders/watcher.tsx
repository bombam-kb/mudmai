"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { isSupabaseConfigured } from "@/lib/env";
import { reminderCopyFor } from "@/lib/reminders/copy";
import { dueReminderKinds } from "@/lib/reminders/engine";
import { factsFromLocal } from "@/lib/reminders/context";
import { KIND_CADENCE, KIND_HREF, REMINDER_KINDS, sentKey, type ReminderKind } from "@/lib/reminders/kinds";
import {
  DEFAULT_PREFS,
  notificationsOn,
  type ReminderLogDto,
  type ReminderPrefDto,
} from "@/lib/reminders/schema";
import { isMonthPlanFilled } from "@/lib/month-plan/schema";
import { useRemindersStore } from "@/stores/reminders-store";
import { useTodosStore } from "@/stores/todos-store";
import { useMonthPlanStore } from "@/stores/month-plan-store";
import { useGoalsStore } from "@/stores/goals-store";
import { useReviewsStore } from "@/stores/reviews-store";
import { bangkokClock, shiftYearMonth, shiftYearQuarter } from "@/lib/year";

const PREFS_TTL_MS = 30_000;
const TICK_GAP_MS = 8_000;

let prefsMemo: { at: number; prefs: ReminderPrefDto[] } | null = null;
let lastTickAt = 0;

async function loadPrefs(demo: boolean): Promise<ReminderPrefDto[]> {
  if (demo) return useRemindersStore.getState().prefs;
  if (prefsMemo && Date.now() - prefsMemo.at < PREFS_TTL_MS) return prefsMemo.prefs;
  const response = await fetch("/api/reminders/prefs");
  const json = (await response.json()) as { ok: boolean; prefs?: ReminderPrefDto[] };
  const prefs = !json.ok || !json.prefs ? DEFAULT_PREFS : json.prefs;
  prefsMemo = { at: Date.now(), prefs };
  return prefs;
}

function notifyBrowser(log: ReminderLogDto, locale: "th" | "en") {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const note = new Notification(log.title, {
      body: log.body.slice(0, 140),
      tag: `jr-${log.kind ?? log.cadence}`,
    });
    note.onclick = () => {
      window.focus();
      const path = log.href.startsWith("/") ? log.href : `/${log.href}`;
      window.location.assign(`/${locale}${path}`);
      note.close();
    };
  } catch {
    /* ignore */
  }
}

function demoDispatch(locale: "th" | "en") {
  const now = new Date();
  const clock = bangkokClock(now);
  const nextMonth = shiftYearMonth(clock.year, clock.month, 1);
  const nextQuarter = shiftYearQuarter(clock.year, clock.quarter, 1);
  const plans = useMonthPlanStore.getState();
  const goals = useGoalsStore.getState().goals;
  const reviews = useReviewsStore.getState();
  const logs = useRemindersStore.getState().logs;
  const sent = new Set(
    logs.flatMap((log) => {
      const kind = log.kind as ReminderKind | undefined;
      if (!kind || !REMINDER_KINDS.includes(kind)) return [];
      return [sentKey(kind, new Date(log.sentAt))];
    }),
  );
  const facts = factsFromLocal({
    enabled: notificationsOn(useRemindersStore.getState().prefs),
    todos: useTodosStore.getState().todos,
    monthPlanned: isMonthPlanFilled(plans.forMonth(clock.year, clock.month)),
    nextMonthPlanned: isMonthPlanFilled(plans.forMonth(nextMonth.year, nextMonth.month)),
    quarterPlanned: goals.some((goal) => goal.year === clock.year && goal.quarter === clock.quarter),
    nextQuarterPlanned: goals.some(
      (goal) => goal.year === nextQuarter.year && goal.quarter === nextQuarter.quarter,
    ),
    monthlyReviewDone: reviews.monthly.some(
      (item) => item.year === clock.year && item.month === clock.month,
    ),
    quarterlyReviewDone: reviews.quarterly.some(
      (item) => item.year === clock.year && item.quarter === clock.quarter,
    ),
    sent,
    now,
  });
  const due = dueReminderKinds(facts, now);
  for (const kind of due) {
    const copy = reminderCopyFor(kind, locale, facts, now);
    const log: ReminderLogDto = {
      id: crypto.randomUUID(),
      cadence: KIND_CADENCE[kind],
      kind,
      channel: "IN_APP",
      title: copy.title,
      body: copy.body,
      href: KIND_HREF[kind],
      isRead: false,
      sentAt: now.toISOString(),
    };
    useRemindersStore.getState().addLog(log);
    notifyBrowser(log, locale);
  }
}

export function ReminderWatcher() {
  const locale = useLocale() === "en" ? "en" : "th";
  const running = useRef(false);

  useEffect(() => {
    const demo = !isSupabaseConfigured();

    async function tick() {
      if (running.current || document.visibilityState === "hidden") return;
      if (Date.now() - lastTickAt < TICK_GAP_MS) return;
      lastTickAt = Date.now();
      running.current = true;
      try {
        const prefs = await loadPrefs(demo);
        if (!notificationsOn(prefs)) return;
        if (demo) {
          demoDispatch(locale);
          return;
        }
        const response = await fetch("/api/reminders", { method: "POST" });
        const json = (await response.json()) as {
          ok: boolean;
          skipped?: boolean;
          logs?: ReminderLogDto[];
        };
        if (json.ok && json.logs) {
          for (const log of json.logs) notifyBrowser(log, locale);
        }
      } catch {
        /* ignore polling errors */
      } finally {
        running.current = false;
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), 30_000);
    const onFocus = () => void tick();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [locale]);

  return null;
}
