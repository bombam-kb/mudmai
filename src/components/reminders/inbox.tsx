"use client";

import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Link, useRouter } from "@/i18n/navigation";
import { signOutClient } from "@/lib/auth/sign-out-client";
import type { ReminderLogDto } from "@/lib/reminders/schema";
import { useRemindersStore } from "@/stores/reminders-store";

type Props = {
  name: string;
  demoMode: boolean;
  initialLogs: ReminderLogDto[];
};

export function ReminderInbox({ name, demoMode, initialLogs }: Props) {
  const t = useTranslations("reminders");
  const router = useRouter();
  const stored = useRemindersStore((state) => state.logs);
  const logs = demoMode ? stored : initialLogs;

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  async function mark(id: string) {
    if (demoMode) {
      useRemindersStore.getState().markRead(id);
      return;
    }
    await fetch(`/api/reminders/${id}`, { method: "PATCH" });
    router.refresh();
  }

  async function markAll() {
    if (demoMode) {
      useRemindersStore.getState().markAllRead();
      return;
    }
    await fetch("/api/reminders", { method: "PATCH" });
    router.refresh();
  }

  const unread = logs.filter((log) => !log.isRead).length;

  return (
    <AppShell name={name} onSignOut={signOut}>
      <div className="jr-page-head mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-personal">
            {t("eyebrow")}
          </p>
          <h1 className="font-display text-4xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("unread", { count: unread })}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void markAll()}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted ring-1 ring-slate-200"
          >
            {t("markAll")}
          </button>
          <Link
            href="/settings"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            {t("openSettings")}
          </Link>
        </div>
      </div>

      {demoMode ? (
        <p className="mb-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("demo")}
        </p>
      ) : null}

      {logs.length === 0 ? (
        <p className="rounded-3xl bg-white p-6 text-muted shadow-card ring-1 ring-slate-100">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <li
              key={log.id}
              className={`rounded-3xl bg-white p-5 shadow-card ring-1 ${
                log.isRead ? "ring-slate-100" : "ring-brand/40"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-personal">
                    {t(`cadence.${log.cadence}`)}
                  </p>
                  <h2 className="mt-1 font-display text-2xl">{log.title}</h2>
                  <p className="mt-1 text-sm text-muted">{log.body}</p>
                  <p className="mt-2 text-xs text-muted">
                    {new Date(log.sentAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!log.isRead ? (
                    <button
                      type="button"
                      onClick={() => void mark(log.id)}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold"
                    >
                      {t("markRead")}
                    </button>
                  ) : null}
                  <Link
                    href={log.href}
                    className="rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    {t("open")}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
