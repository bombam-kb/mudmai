"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CADENCES, CHANNELS, mergePrefs, type ChannelId, type ReminderPrefDto } from "@/lib/reminders/schema";
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
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const source = mergePrefs(demoMode ? storedPrefs : prefs);
  const lineReady = Boolean(line?.linked && line.messagingConfigured);
  const usesLine = source.some((pref) => pref.enabled && pref.channel === "LINE");

  async function save(pref: ReminderPrefDto) {
    setSaving(pref.cadence);
    setNotice("");
    try {
      if (demoMode) {
        useRemindersStore.getState().setPref(pref);
      } else {
        const response = await fetch("/api/reminders/prefs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pref),
        });
        const json = (await response.json()) as { ok: boolean; pref?: ReminderPrefDto };
        if (!json.ok || !json.pref) throw new Error("save");
        setPrefs((current) =>
          current.map((item) => (item.cadence === json.pref!.cadence ? json.pref! : item)),
        );
      }
      setNotice(t("saved"));
    } catch {
      setNotice(t("error"));
    } finally {
      setSaving(null);
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

  async function enableBrowser(pref: ReminderPrefDto) {
    if (!("Notification" in window)) {
      setNotice(t("notifyUnsupported"));
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setNotice(t("notifyDenied"));
      return;
    }
    await save({ ...pref, channel: "BROWSER" });
  }

  async function setChannel(pref: ReminderPrefDto, channel: ChannelId) {
    if (channel === "BROWSER") {
      await enableBrowser(pref);
      return;
    }
    if (channel === "LINE") {
      if (!line?.loginConfigured) {
        setNotice(t("lineChannelUnavailable"));
        return;
      }
      if (!line.linked) {
        setNotice(t("lineConnectFirst"));
        return;
      }
      if (!line.messagingConfigured) {
        setNotice(t("lineMessagingOff"));
        return;
      }
      if (!line.reminderOptIn) {
        const ok = await patchLine({ reminderOptIn: true });
        if (!ok) {
          setNotice(t("error"));
          return;
        }
      }
    }
    await save({ ...pref, channel });
  }

  async function toggleLineMethod(on: boolean) {
    setSaving("line");
    setNotice("");
    try {
      if (!on) {
        if (line?.linked) await patchLine({ reminderOptIn: false });
        for (const pref of source) {
          if (pref.channel === "LINE") await save({ ...pref, channel: "IN_APP" });
        }
        return;
      }
      if (!line?.linked) {
        setNotice(t("lineConnectFirst"));
        return;
      }
      const ok = await patchLine({ reminderOptIn: true });
      if (!ok) throw new Error("line");
      for (const pref of source) {
        if (pref.enabled && pref.channel === "IN_APP") {
          await save({ ...pref, channel: "LINE" });
        }
      }
    } catch {
      setNotice(t("error"));
    } finally {
      setSaving(null);
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

      <div className="mt-5 rounded-2xl bg-violet-50/80 p-4 ring-1 ring-violet-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-personal">
          {t("channelLabel")}
        </p>
        <label className="mt-3 flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1"
            checked={Boolean(line?.reminderOptIn) || usesLine}
            disabled={Boolean(saving) || demoMode || !lineReady}
            onChange={(event) => void toggleLineMethod(event.target.checked)}
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
            className="mt-3 inline-flex rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-white"
          >
            {t("lineConnect")}
          </a>
        ) : !line.reachable && line.addFriendUrl ? (
          <a
            href={line.addFriendUrl}
            className="mt-3 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            {t("lineAddFriend")}
          </a>
        ) : null}
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-personal">
        {t("whenLabel")}
      </p>
      <div className="mt-3 grid gap-3">
        {CADENCES.map((cadence) => {
          const pref = source.find((item) => item.cadence === cadence)!;
          const time = `${String(pref.hour).padStart(2, "0")}:${String(pref.minute).padStart(2, "0")}`;
          return (
            <div key={cadence} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{tr(`cadence.${cadence}`)}</p>
                  <p className="mt-0.5 text-xs text-muted">{t(`cadenceHint.${cadence}`)}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pref.enabled}
                    onChange={(event) => void save({ ...pref, enabled: event.target.checked })}
                  />
                  {t("enabled")}
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <span className="text-muted">{t("timeLabel")}</span>
                  <input
                    type="time"
                    value={time}
                    disabled={!pref.enabled}
                    onChange={(event) => {
                      const [hour, minute] = event.target.value.split(":").map(Number);
                      void save({ ...pref, hour, minute });
                    }}
                    className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200"
                  />
                </label>
                {cadence === "WEEKLY" ? (
                  <select
                    value={pref.weekday ?? 0}
                    disabled={!pref.enabled}
                    onChange={(event) =>
                      void save({ ...pref, weekday: Number(event.target.value) })
                    }
                    className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200"
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <option key={day} value={day}>
                        {t(`weekdays.${day}`)}
                      </option>
                    ))}
                  </select>
                ) : null}
                <label className="flex items-center gap-2">
                  <span className="text-muted">{t("channelLabel")}</span>
                  <select
                    value={pref.channel}
                    disabled={!pref.enabled}
                    onChange={(event) =>
                      void setChannel(pref, event.target.value as ChannelId)
                    }
                    className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200"
                  >
                    {CHANNELS.map((channel) => (
                      <option
                        key={channel}
                        value={channel}
                        disabled={channel === "LINE" && !lineReady}
                      >
                        {t(`channel${channel === "IN_APP" ? "InApp" : channel === "BROWSER" ? "Browser" : "Line"}`)}
                      </option>
                    ))}
                  </select>
                </label>
                {pref.channel === "BROWSER" && pref.enabled ? (
                  <button
                    type="button"
                    onClick={() => void enableBrowser(pref)}
                    className="rounded-full bg-brand px-3 py-1 font-semibold text-white"
                  >
                    {t("enableNotify")}
                  </button>
                ) : null}
                {saving === cadence ? (
                  <span className="text-muted">{t("saving")}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {notice ? <p className="mt-3 text-sm text-muted">{notice}</p> : null}
    </section>
  );
}
