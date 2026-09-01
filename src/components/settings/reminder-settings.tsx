"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { mergePrefs, notificationsOn, type ReminderPrefDto } from "@/lib/reminders/schema";
import { useRemindersStore } from "@/stores/reminders-store";
import type { LineStatusDto } from "@/components/settings/line-connect";

type Props = {
  demoMode: boolean;
  initialPrefs: ReminderPrefDto[];
  line: LineStatusDto | null;
  onLineStatus?: (status: LineStatusDto) => void;
};

export function ReminderSettingsCard({
  demoMode,
  initialPrefs,
  line,
  onLineStatus,
}: Props) {
  const t = useTranslations("settings");
  const tr = useTranslations("reminders");
  const locale = useLocale();
  const storedPrefs = useRemindersStore((state) => state.prefs);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const source = mergePrefs(demoMode ? storedPrefs : prefs);
  const enabled = notificationsOn(source);
  const lineReady = Boolean(line?.linked && line.messagingConfigured);

  async function setEnabled(next: boolean) {
    setSaving(true);
    setNotice("");
    try {
      if (demoMode) {
        useRemindersStore.getState().replacePrefs(source.map((pref) => ({ ...pref, enabled: next })));
      } else {
        const response = await fetch("/api/reminders/prefs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: next }),
        });
        const json = (await response.json()) as { ok: boolean; prefs?: ReminderPrefDto[] };
        if (!json.ok || !json.prefs) throw new Error("save");
        setPrefs(json.prefs);
      }
      setNotice(t("saved"));
    } catch {
      setNotice(t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function patchLine(body: { reminderOptIn: boolean }) {
    if (demoMode || !line?.linked) return false;
    const response = await fetch("/api/line/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as LineStatusDto & { ok?: boolean };
    if (!response.ok || !json.ok) return false;
    onLineStatus?.(line ? { ...line, ...json } : json);
    return true;
  }

  async function toggleLine(on: boolean) {
    setSaving(true);
    setNotice("");
    try {
      if (!on) {
        if (line?.linked) await patchLine({ reminderOptIn: false });
        return;
      }
      if (!line?.linked) {
        setNotice(t("lineConnectFirst"));
        return;
      }
      const ok = await patchLine({ reminderOptIn: true });
      if (!ok) throw new Error("line");
    } catch {
      setNotice(t("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
      <h2 className="font-display text-2xl">{t("reminders")}</h2>
      <p className="mt-1 text-sm text-muted">{t("remindersBody")}</p>
      {demoMode ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {tr("demo")}
        </p>
      ) : null}

      <label className="mt-5 flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
        <span>
          <span className="block font-semibold">{t("remindersToggle")}</span>
          <span className="mt-0.5 block text-xs text-muted">{t("remindersToggleHint")}</span>
        </span>
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={enabled}
          disabled={saving}
          onChange={(event) => void setEnabled(event.target.checked)}
        />
      </label>

      <div className="mt-4 rounded-2xl bg-violet-50/80 p-4 ring-1 ring-violet-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-personal">
          {t("channelLabel")}
        </p>
        <label className="mt-3 flex min-h-11 items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5"
            checked={Boolean(line?.reminderOptIn)}
            disabled={Boolean(saving) || demoMode || !lineReady || !enabled}
            onChange={(event) => void toggleLine(event.target.checked)}
          />
          <span>
            <span className="font-semibold">{t("lineReminder")}</span>
            <span className="mt-0.5 block text-muted">{t("lineReminderBody")}</span>
          </span>
        </label>
        {!line?.loginConfigured ? (
          <p className="mt-3 text-sm text-muted">{t("lineChannelUnavailable")}</p>
        ) : !line.linked ? (
          <a
            href={`/api/line/start?intent=link&locale=${locale}&next=/settings`}
            className="mt-3 inline-flex min-h-11 items-center rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-white"
          >
            {t("lineConnect")}
          </a>
        ) : !line.reachable && line.addFriendUrl ? (
          <a
            href={line.addFriendUrl}
            className="mt-3 inline-flex min-h-11 items-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            {t("lineAddFriend")}
          </a>
        ) : null}
      </div>

      <div className="mt-5 text-sm text-muted">
        <p className="text-xs font-semibold uppercase tracking-wide text-personal">{t("whenLabel")}</p>
        <p className="mt-2 font-semibold text-ink">{t("scheduleHeavyTitle")}</p>
        <p className="mt-1">{t("scheduleHeavyBody")}</p>
        <p className="mt-3 font-semibold text-ink">{t("scheduleLightTitle")}</p>
        <p className="mt-1">{t("scheduleLightBody")}</p>
        <p className="mt-3 font-semibold text-ink">{t("scheduleCycleTitle")}</p>
        <p className="mt-1">{t("scheduleCycleBody")}</p>
      </div>
      {notice ? <p className="mt-3 text-sm text-muted">{notice}</p> : null}
    </section>
  );
}
