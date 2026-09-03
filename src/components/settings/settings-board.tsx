"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { LanguageToggle } from "@/components/language-toggle";
import { AppearanceToggles } from "@/components/appearance-toggles";
import { PillarLegend } from "@/components/pillars/legend";
import { LineConnectCard, type LineStatusDto } from "@/components/settings/line-connect";
import { ReminderSettingsCard } from "@/components/settings/reminder-settings";
import { KnowSection, type JourneyReflection } from "@/components/settings/know-section";
import { MobileFold } from "@/components/mobile-fold";
import { PLAN } from "@/lib/billing/plan";
import { Link, useRouter } from "@/i18n/navigation";
import { signOutClient } from "@/lib/auth/sign-out-client";
import type { ReminderPrefDto } from "@/lib/reminders/schema";
import type { NudgeDto } from "@/lib/nudge/schema";

export type ReferralHistoryEntry = {
  createdAt: string | Date;
  paid: boolean;
  pointsAwarded: number;
};

export type ReferralSummary = {
  code: string;
  balance: number;
  costThb: number;
  canRedeem: boolean;
  history: ReferralHistoryEntry[];
};

type Props = {
  name: string;
  demoMode: boolean;
  initialPrefs: ReminderPrefDto[];
  referral: ReferralSummary | null;
  line: LineStatusDto | null;
  lineError?: string | null;
  reflection?: JourneyReflection | null;
  nudges?: NudgeDto[];
  unreadReminders?: number;
};

export function SettingsBoard({
  name,
  demoMode,
  initialPrefs,
  referral,
  line,
  lineError,
  reflection = null,
  nudges = [],
  unreadReminders = 0,
}: Props) {
  const t = useTranslations("settings");
  const tr = useTranslations("reminders");
  const locale = useLocale();
  const router = useRouter();
  const [lineStatus, setLineStatus] = useState(line);

  const [referralState, setReferralState] = useState(referral);
  const [referralNotice, setReferralNotice] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralLink =
    referralState && typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/signup?ref=${referralState.code}`
      : "";

  async function copyReferralLink() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setReferralNotice(t("referralCopyError"));
    }
  }

  async function redeemPoints() {
    setRedeeming(true);
    setReferralNotice("");
    try {
      const response = await fetch("/api/billing/redeem", { method: "POST" });
      const json = (await response.json().catch(() => null)) as {
        ok?: boolean;
        balance?: number;
        error?: string;
      } | null;
      if (!response.ok || !json?.ok) {
        setReferralNotice(
          json?.error === "INSUFFICIENT_POINTS"
            ? t("referralRedeemInsufficient")
            : json?.error === "YEARLY_CAP_REACHED"
              ? t("referralRedeemCapped")
              : t("error"),
        );
        return;
      }
      setReferralState((current) =>
        current ? { ...current, balance: json.balance ?? current.balance, canRedeem: false } : current,
      );
      setReferralNotice(t("referralRedeemSuccess"));
    } catch {
      setReferralNotice(t("error"));
    } finally {
      setRedeeming(false);
    }
  }

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  return (
    <AppShell name={name} onSignOut={signOut}>
      <p className="text-sm font-semibold uppercase tracking-wide text-personal">
        {t("eyebrow")}
      </p>
      <h1 className="font-display text-4xl">{t("title")}</h1>

      <KnowSection
        demoMode={demoMode}
        reflection={reflection}
        nudges={nudges}
        unreadReminders={unreadReminders}
      />

      <section className="mt-6 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
        <h2 className="font-display text-2xl">{t("planTitle")}</h2>
        <p className="mt-1 text-sm text-muted">
          {t("planBody", {
            yearly: PLAN.yearlyThb,
            founder: PLAN.founderThb,
          })}
        </p>
        <ul className="mt-3 space-y-1 text-sm font-semibold text-ink">
          <li>{t("planFree")}</li>
          <li>{t("planFounder", { price: PLAN.founderThb })}</li>
          <li>{t("planYearly", { price: PLAN.yearlyThb })}</li>
        </ul>
        <p className="mt-3 text-xs font-semibold text-personal">{t("planPayLater")}</p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          {t("planCta")}
        </Link>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
        <MobileFold
          title={t("referralTitle")}
          preview={
            <p className="text-sm text-muted">
              {t("referralBody", { credit: PLAN.referralCreditThb })}
            </p>
          }
        >
          <p className="text-sm text-muted">
            {t("referralBody", { credit: PLAN.referralCreditThb })}
          </p>
          {demoMode ? (
            <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {tr("demo")}
            </p>
          ) : referralState ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  readOnly
                  value={referralLink}
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-full bg-slate-50 px-4 py-2 text-sm text-ink ring-1 ring-slate-200"
                />
                <button
                  type="button"
                  onClick={() => void copyReferralLink()}
                  className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
                >
                  {copied ? t("referralCopied") : t("referralCopy")}
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-muted">{t("referralBalance")}</p>
                <p className="font-display text-3xl text-ink">
                  {t("referralPoints", { points: referralState.balance })}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {t("referralRedeemCost", { cost: referralState.costThb })}
                </p>
                <button
                  type="button"
                  onClick={() => void redeemPoints()}
                  disabled={!referralState.canRedeem || redeeming}
                  className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {redeeming ? t("referralRedeeming") : t("referralRedeemCta")}
                </button>
                {referralNotice ? (
                  <p className="mt-2 text-sm text-muted">{referralNotice}</p>
                ) : null}
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold text-ink">{t("referralHistoryTitle")}</p>
                {referralState.history.length === 0 ? (
                  <p className="mt-1 text-sm text-muted">{t("referralHistoryEmpty")}</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-muted">
                    {referralState.history.map((entry, index) => (
                      <li key={index} className="flex items-center justify-between">
                        <span>
                          {new Date(entry.createdAt).toLocaleDateString(
                            locale === "en" ? "en-GB" : "th-TH",
                          )}
                        </span>
                        <span className={entry.paid ? "font-semibold text-finance" : ""}>
                          {entry.paid
                            ? t("referralHistoryPaid", { points: entry.pointsAwarded })
                            : t("referralHistoryPending")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">{t("error")}</p>
          )}
        </MobileFold>
      </section>

      <section className="jr-desktop-only mt-6 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
        <h2 className="font-display text-2xl">{t("appearance")}</h2>
        <p className="mt-1 text-sm text-muted">{t("appearanceBody")}</p>
        <div className="mt-4">
          <AppearanceToggles size="panel" />
        </div>
      </section>

      <section className="jr-desktop-only mt-4 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
        <h2 className="font-display text-2xl">{t("pillarLegend")}</h2>
        <p className="mt-1 text-sm text-muted">{t("pillarLegendBody")}</p>
        <div className="mt-4">
          <PillarLegend variant="labeled" />
        </div>
      </section>

      <section className="jr-desktop-only mt-4 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
        <h2 className="font-display text-2xl">{t("language")}</h2>
        <p className="mt-1 text-sm text-muted">{t("languageBody")}</p>
        <div className="mt-3">
          <LanguageToggle />
        </div>
      </section>

      <ReminderSettingsCard
        demoMode={demoMode}
        initialPrefs={initialPrefs}
        line={lineStatus}
        onLineStatus={setLineStatus}
      />

      <LineConnectCard
        demoMode={demoMode}
        initial={lineStatus}
        error={lineError}
        onStatus={setLineStatus}
      />

      <section className="mt-4 rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
        <MobileFold title={t("privacy")} preview={<p className="text-sm text-muted">{t("privacyBody")}</p>}>
        <p className="text-sm text-muted">{t("privacyBody")}</p>
        <Link
          href="/privacy"
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-slate-200"
        >
          {t("privacyCta")}
        </Link>
        </MobileFold>
      </section>
    </AppShell>
  );
}
