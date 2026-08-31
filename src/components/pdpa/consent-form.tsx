"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { AppearanceToggles } from "@/components/appearance-toggles";
import { PdpaNotice } from "@/components/pdpa/notice";
import { isSupabaseConfigured } from "@/lib/env";
import { PDPA_STORAGE_KEY, PDPA_VERSION } from "@/lib/pdpa";
import { BrandLockup } from "@/components/icons";

export function PdpaConsentForm() {
  const t = useTranslations("pdpa");
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!agreed) return;
    setPending(true);
    setError(null);
    try {
      if (isSupabaseConfigured()) {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale: document.documentElement.lang,
            pdpaConsent: true,
            pdpaVersion: PDPA_VERSION,
          }),
        });
        const json = (await response.json().catch(() => null)) as {
          ok?: boolean;
          saved?: boolean;
        } | null;
        if (!response.ok || !json?.ok || json.saved !== true) {
          throw new Error("consent");
        }
      }
      localStorage.setItem(PDPA_STORAGE_KEY, new Date().toISOString());
      router.replace("/home");
      router.refresh();
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="jr-page-wash min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Link href="/">
          <BrandLockup />
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AppearanceToggles showSignOut />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-personal">
          {t("consentEyebrow")}
        </p>
        <h1 className="mt-2 font-display text-4xl">{t("consentTitle")}</h1>
        <p className="mt-2 text-muted">{t("consentSubtitle")}</p>
        <div className="mt-6 max-h-[50vh] overflow-y-auto rounded-[2rem] bg-white/90 p-6 shadow-card ring-1 ring-white">
          <PdpaNotice />
        </div>
        <form className="mt-6 space-y-4 rounded-[2rem] bg-white p-6 shadow-card" onSubmit={onSubmit}>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              required
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-1"
            />
            <span>
              {t("checkbox")}{" "}
              <Link href="/privacy" className="font-semibold text-brand">
                {t("link")}
              </Link>
            </span>
          </label>
          {error ? <p className="text-sm text-physical">{error}</p> : null}
          <button
            type="submit"
            disabled={!agreed || pending}
            className="w-full rounded-full bg-brand py-3 font-semibold text-white disabled:opacity-60"
          >
            {t("accept")}
          </button>
        </form>
      </main>
    </div>
  );
}
