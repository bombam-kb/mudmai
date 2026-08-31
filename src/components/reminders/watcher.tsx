"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { isSupabaseConfigured } from "@/lib/env";
import { REMINDER_COPY, REMINDER_HREF } from "@/lib/reminders/copy";
import { dueCadences } from "@/lib/reminders/engine";
import { DEFAULT_PREFS, type ReminderLogDto, type ReminderPrefDto } from "@/lib/reminders/schema";
import { useRemindersStore } from "@/stores/reminders-store";

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
      body: log.body,
      tag: `jr-${log.cadence}`,
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
        const due = dueCadences(prefs);
        for (const pref of due) {
          if (demo) {
            const copy = REMINDER_COPY[locale][pref.cadence];
            const log: ReminderLogDto = {
              id: crypto.randomUUID(),
              cadence: pref.cadence,
              channel: pref.channel,
              title: copy.title,
              body: copy.body,
              href: REMINDER_HREF[pref.cadence],
              isRead: false,
              sentAt: new Date().toISOString(),
            };
            useRemindersStore.getState().addLog(log);
            if (pref.channel === "BROWSER") notifyBrowser(log, locale);
            continue;
          }
          const response = await fetch("/api/reminders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cadence: pref.cadence }),
          });
          const json = (await response.json()) as {
            ok: boolean;
            skipped?: boolean;
            log?: ReminderLogDto;
          };
          if (json.ok && json.log && pref.channel === "BROWSER") {
            notifyBrowser(json.log, locale);
          }
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
