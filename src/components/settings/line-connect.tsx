"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export type LineStatusDto = {
  loginConfigured: boolean;
  messagingConfigured: boolean;
  linked: boolean;
  reachable: boolean;
  reminderOptIn: boolean;
  broadcastOptIn: boolean;
  canUnlink: boolean;
  addFriendUrl: string | null;
  lineReminderStatus?: "ready" | "off" | "unlinked" | "unreachable" | "no_messaging";
};

export function LineConnectCard({
  demoMode,
  initial,
  error,
  onStatus,
}: {
  demoMode: boolean;
  initial: LineStatusDto | null;
  error?: string | null;
  onStatus?: (status: LineStatusDto) => void;
}) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const [status, setStatus] = useState(initial);
  const [notice, setNotice] = useState(
    error === "line_taken" ? t("lineTaken") : error === "line_denied" ? t("lineDenied") : "",
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setStatus(initial);
  }, [initial]);

  if (demoMode || !status || !status.loginConfigured) return null;

  async function refresh() {
    const response = await fetch("/api/line/account");
    const json = (await response.json()) as LineStatusDto & { ok?: boolean };
    if (json.ok) {
      setStatus(json);
      onStatus?.(json);
    }
  }

  async function patch(body: { reminderOptIn?: boolean; broadcastOptIn?: boolean }) {
    setPending(true);
    setNotice("");
    try {
      const response = await fetch("/api/line/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json()) as LineStatusDto & { ok?: boolean };
      if (!response.ok || !json.ok) throw new Error("patch");
      const next = status ? { ...status, ...json } : json;
      setStatus(next);
      onStatus?.(next);
      setNotice(t("saved"));
    } catch {
      setNotice(t("error"));
    } finally {
      setPending(false);
    }
  }

  async function unlink() {
    if (!window.confirm(t("lineUnlinkConfirm"))) return;
    setPending(true);
    try {
      const response = await fetch("/api/line/account", { method: "DELETE" });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (json.error === "line_only") {
        setNotice(t("lineOnly"));
        return;
      }
      if (!response.ok || !json.ok) throw new Error("unlink");
      await refresh();
      setNotice(t("saved"));
    } catch {
      setNotice(t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
      <h2 className="font-display text-2xl">{t("lineTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("lineBody")}</p>
      <p className="mt-2 text-sm text-muted">{t("lineMenuHint")}</p>

      {status.linked ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-finance">
            {status.reachable ? t("lineLinkedReady") : t("lineLinkedBlocked")}
          </p>
          {!status.reachable && status.addFriendUrl ? (
            <a
              href={status.addFriendUrl}
              className="inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
            >
              {t("lineAddFriend")}
            </a>
          ) : null}
          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={status.broadcastOptIn}
              disabled={pending}
              onChange={(event) => void patch({ broadcastOptIn: event.target.checked })}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">{t("lineBroadcast")}</span>
              <span className="mt-0.5 block text-muted">{t("lineBroadcastBody")}</span>
            </span>
          </label>
          {status.canUnlink ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => void unlink()}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-slate-200"
            >
              {t("lineUnlink")}
            </button>
          ) : (
            <p className="text-xs text-muted">{t("lineOnly")}</p>
          )}
        </div>
      ) : (
        <a
          href={`/api/line/start?intent=link&locale=${locale}&next=/settings`}
          className="mt-4 inline-flex rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-white"
        >
          {t("lineConnect")}
        </a>
      )}
      {notice ? <p className="mt-3 text-sm text-muted">{notice}</p> : null}
    </section>
  );
}
