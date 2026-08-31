"use client";

import { useLocale, useTranslations } from "next-intl";

export type LineNotifyState = {
  loginConfigured: boolean;
  messagingConfigured: boolean;
  linked: boolean;
  reachable: boolean;
  addFriendUrl: string | null;
};

export function LineNotifyBanner({
  demoMode,
  line,
}: {
  demoMode?: boolean;
  line?: LineNotifyState | null;
}) {
  const t = useTranslations("home");
  const ts = useTranslations("settings");
  const locale = useLocale();
  if (demoMode || !line?.loginConfigured) return null;
  if (line.linked && line.reachable) return null;

  return (
    <section className="rounded-[2rem] bg-[#06C755] p-5 text-white shadow-card">
      <h2 className="font-display text-2xl">{t("lineNotifyTitle")}</h2>
      <p className="mt-1 text-sm text-white/90">{t("lineNotifyBody")}</p>
      {!line.linked ? (
        <a
          href={`/api/line/start?intent=link&locale=${locale}&next=/home`}
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#06C755]"
        >
          {ts("lineConnect")}
        </a>
      ) : line.addFriendUrl ? (
        <a
          href={line.addFriendUrl}
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#06C755]"
        >
          {ts("lineAddFriend")}
        </a>
      ) : null}
    </section>
  );
}
