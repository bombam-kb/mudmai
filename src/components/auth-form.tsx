"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { AppearanceToggles } from "./appearance-toggles";
import { BrandLockup } from "@/components/icons";
import { PDPA_VERSION } from "@/lib/pdpa";
import { PLAN, parseCheckoutPlan } from "@/lib/billing/plan";

type Mode = "login" | "signup";

export function AuthForm({
  mode,
  plan,
  referralCode,
  lineLoginEnabled = false,
  errorCode,
}: {
  mode: Mode;
  plan?: string | null;
  referralCode?: string | null;
  lineLoginEnabled?: boolean;
  errorCode?: string | null;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const checkoutPlan = parseCheckoutPlan(plan);
  const afterAuth = checkoutPlan ? `/pricing?plan=${checkoutPlan}` : null;
  const cleanReferralCode = referralCode?.trim() || null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(() => {
    if (errorCode === "line_config") return "line_config";
    if (errorCode === "line_denied") return "line_denied";
    if (errorCode === "line_session") return "line_session";
    if (errorCode === "line") return "line";
    return null;
  });
  const [info, setInfo] = useState<string | null>(null);
  const [pdpa, setPdpa] = useState(false);
  const [pending, setPending] = useState(false);
  const configured = isSupabaseConfigured();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!configured) {
      setError("config");
      return;
    }

    if (mode === "signup" && !pdpa) {
      setError("pdpa");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              ...(checkoutPlan ? { planIntent: checkoutPlan } : {}),
              ...(cleanReferralCode ? { referralCode: cleanReferralCode } : {}),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback${
              afterAuth ? `?next=${encodeURIComponent(afterAuth)}` : ""
            }`,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              locale: document.documentElement.lang,
              pdpaConsent: true,
              pdpaVersion: PDPA_VERSION,
            }),
          });
          router.replace(afterAuth ?? "/onboarding");
          router.refresh();
          return;
        }
        setInfo(t("checkEmail"));
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: document.documentElement.lang }),
        });
        router.replace(afterAuth ?? "/home");
        router.refresh();
      }
    } catch {
      setError("generic");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/">
          <BrandLockup />
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AppearanceToggles />
        </div>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100">
        <h1 className="font-display text-3xl text-ink">
          {mode === "login" ? t("loginTitle") : t("signupTitle")}
        </h1>
        <p className="mt-1 text-muted">
          {mode === "login" ? t("loginSubtitle") : t("signupSubtitle")}
        </p>
        {mode === "signup" && cleanReferralCode ? (
          <p className="mt-3 rounded-2xl bg-personal/10 px-3 py-2 text-sm font-semibold text-personal">
            {t("referralNotice", { credit: PLAN.referralCreditThb })}
          </p>
        ) : null}
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {mode === "signup" ? (
            <label className="block text-sm font-medium text-ink">
              {t("name")}
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-brand focus:ring-2"
              />
            </label>
          ) : null}
          <label className="block text-sm font-medium text-ink">
            {t("email")}
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-brand focus:ring-2"
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            {t("password")}
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-brand focus:ring-2"
            />
          </label>
          {mode === "signup" ? (
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                required
                type="checkbox"
                checked={pdpa}
                onChange={(event) => setPdpa(event.target.checked)}
                className="mt-1"
              />
              <span>
                {t("pdpaAgree")}{" "}
                <Link href="/privacy" className="font-semibold text-brand">
                  {t("pdpaLink")}
                </Link>
              </span>
            </label>
          ) : null}
          {error ? (
            <p className="text-sm text-physical">
              {error === "pdpa"
                ? t("pdpaRequired")
                : error === "config"
                  ? t("missingConfig")
                  : error === "line_config"
                    ? t("lineConfig")
                    : error === "line_denied"
                      ? t("lineDenied")
                      : error === "line_session"
                        ? t("lineSession")
                        : error === "line"
                          ? t("lineError")
                          : t("error")}
            </p>
          ) : null}
          {info ? <p className="text-sm text-finance">{info}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-brand py-3 font-semibold text-white disabled:opacity-60"
          >
            {mode === "login" ? t("submitLogin") : t("submitSignup")}
          </button>
        </form>
        {lineLoginEnabled ? (
          <div className="mt-4">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-muted">
              {t("or")}
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                if (mode === "signup" && !pdpa) {
                  setError("pdpa");
                  return;
                }
                if (!configured) {
                  setError("config");
                  return;
                }
                const params = new URLSearchParams({
                  intent: "login",
                  locale: document.documentElement.lang === "en" ? "en" : "th",
                });
                if (mode === "signup") params.set("pdpa", "1");
                if (checkoutPlan) params.set("plan", checkoutPlan);
                if (cleanReferralCode) params.set("ref", cleanReferralCode);
                if (afterAuth) params.set("next", afterAuth);
                window.location.href = `/api/line/start?${params.toString()}`;
              }}
              className="w-full rounded-full bg-[#06C755] py-3 font-semibold text-white disabled:opacity-60"
            >
              {mode === "login" ? t("lineCta") : t("lineCtaSignup")}
            </button>
            <p className="mt-2 text-center text-xs text-muted">{t("lineHint")}</p>
          </div>
        ) : null}
        <p className="mt-4 text-center text-sm text-muted">
          {mode === "login" ? (
            <Link
              href={checkoutPlan ? `/signup?plan=${checkoutPlan}` : "/signup"}
              className="font-semibold text-brand"
            >
              {t("toSignup")}
            </Link>
          ) : (
            <Link
              href={checkoutPlan ? `/login?plan=${checkoutPlan}` : "/login"}
              className="font-semibold text-brand"
            >
              {t("toLogin")}
            </Link>
          )}
        </p>
        <p className="mt-3 text-center text-xs text-muted">
          <Link href="/privacy" className="font-semibold text-brand">
            {t("pdpaLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
