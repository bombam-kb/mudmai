"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  PLAN,
  amountForPlan,
  parseCheckoutPlan,
  type CheckoutPlanId,
} from "@/lib/billing/plan";

type CheckoutState = "idle" | "saving" | "done" | "error";

type ExistingCheckout = {
  plan: string;
  amountThb: number;
  status: string;
  listPriceThb?: number;
  discountThb?: number;
};

type Props = {
  signedIn: boolean;
  initialPlan?: string | null;
  promptPayId?: string;
  existing?: ExistingCheckout | null;
  referralDiscountThb?: number;
};

export function PricingBoard({
  signedIn,
  initialPlan,
  promptPayId,
  existing,
  referralDiscountThb = 0,
}: Props) {
  const t = useTranslations("pricing");
  const parsed = parseCheckoutPlan(initialPlan);
  const [selected, setSelected] = useState<CheckoutPlanId | "free">(parsed ?? "founder");
  const [state, setState] = useState<CheckoutState>(existing ? "done" : "idle");
  const [order, setOrder] = useState<ExistingCheckout | null | undefined>(existing);

  const paid = selected !== "free";
  const listPrice = paid ? amountForPlan(selected) : 0;
  const discount = paid ? Math.min(referralDiscountThb, listPrice) : 0;
  const amount = listPrice - discount;
  const qr =
    paid && promptPayId
      ? `https://promptpay.io/${encodeURIComponent(promptPayId)}/${amount}.png`
      : null;

  const plans = useMemo(
    () =>
      [
        {
          id: "free" as const,
          price: 0,
          badge: t("freeBadge"),
          name: t("freeName"),
          blurb: t("freeBlurb"),
          cta: t("freeCta"),
          featured: false,
          items: [t("free1"), t("free2"), t("free3"), t("free4")],
        },
        {
          id: "founder" as const,
          price: PLAN.founderThb,
          badge: t("founderBadge"),
          name: t("founderName"),
          blurb: t("founderBlurb"),
          cta: t("founderCta", { price: PLAN.founderThb }),
          featured: true,
          items: [t("founder1"), t("founder2"), t("founder3"), t("founder4")],
        },
        {
          id: "yearly" as const,
          price: PLAN.yearlyThb,
          badge: t("yearlyBadge"),
          name: t("yearlyName"),
          blurb: t("yearlyBlurb"),
          cta: t("yearlyCta", { price: PLAN.yearlyThb }),
          featured: false,
          items: [t("yearly1"), t("yearly2"), t("yearly3"), t("yearly4")],
        },
      ] as const,
    [t],
  );

  async function confirmPay() {
    if (!paid) return;
    setState("saving");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const json = (await response.json().catch(() => null)) as {
        ok?: boolean;
        checkout?: ExistingCheckout;
      } | null;
      if (!response.ok || !json?.ok || !json.checkout) throw new Error("checkout");
      setOrder(json.checkout);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const active = selected === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => {
                setSelected(plan.id);
                if (state !== "done") setState("idle");
              }}
              className={`rounded-[2rem] p-6 text-left shadow-card ring-2 transition ${
                plan.featured ? "bg-white" : "bg-white/90"
              } ${active ? "ring-brand" : "ring-white hover:ring-violet-200"}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-personal">
                {plan.badge}
              </p>
              <h2 className="mt-2 font-display text-2xl text-ink">{plan.name}</h2>
              <p className="mt-3 font-display text-4xl text-ink">
                {plan.price === 0 ? t("freePrice") : `฿${plan.price}`}
                {plan.price > 0 ? (
                  <span className="ml-1 text-base font-semibold text-muted">
                    {t("perYear")}
                  </span>
                ) : null}
              </p>
              <p className="mt-2 text-sm text-muted">{plan.blurb}</p>
              <ul className="mt-4 space-y-2 text-sm font-semibold text-ink">
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <span
                className={`mt-6 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                  active
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-ink"
                }`}
              >
                {active ? t("selected") : t("select")}
              </span>
            </button>
          );
        })}
      </div>

      <section className="mt-8 rounded-[2rem] bg-white/90 p-6 shadow-card ring-1 ring-white">
        {selected === "free" ? (
          <div>
            <h3 className="font-display text-2xl">{t("freeCheckoutTitle")}</h3>
            <p className="mt-2 text-sm text-muted">{t("freeCheckoutBody")}</p>
            <Link
              href="/signup"
              className="mt-5 inline-flex rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-card"
            >
              {t("freeCta")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <h3 className="font-display text-2xl">
                {t("payTitle", { price: amount })}
              </h3>
              <p className="mt-2 text-sm text-muted">
                {selected === "founder" ? t("payFounderBody") : t("payYearlyBody", { price: PLAN.yearlyThb })}
              </p>
              {discount > 0 ? (
                <p className="mt-3 rounded-2xl bg-personal/10 px-3 py-2 text-sm font-semibold text-personal">
                  {t("referralDiscountApplied", { discount, listPrice, amount })}
                </p>
              ) : null}
              {promptPayId ? (
                <p className="mt-3 text-sm font-semibold text-ink">
                  {t("promptPay", { id: promptPayId, price: amount })}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted">{t("promptPayLater")}</p>
              )}
              {state === "done" && order ? (
                <p className="mt-4 text-sm font-semibold text-finance">
                  {t("paidPending", { price: order.amountThb })}
                </p>
              ) : null}
              {state === "error" ? (
                <p className="mt-4 text-sm font-semibold text-physical">{t("payError")}</p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-3">
                {signedIn ? (
                  <button
                    type="button"
                    onClick={() => void confirmPay()}
                    disabled={state === "saving" || state === "done"}
                    className="rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-card disabled:opacity-60"
                  >
                    {state === "saving"
                      ? t("paying")
                      : state === "done"
                        ? t("paid")
                        : t("confirmPay", { price: amount })}
                  </button>
                ) : (
                  <Link
                    href={`/signup?plan=${selected}`}
                    className="rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-card"
                  >
                    {t("signupToPay", { price: amount })}
                  </Link>
                )}
                {signedIn ? (
                  <Link
                    href="/home"
                    className="rounded-full bg-white px-6 py-3 font-semibold text-ink ring-1 ring-slate-200"
                  >
                    {t("backToApp")}
                  </Link>
                ) : (
                  <Link
                    href={`/login?plan=${selected}`}
                    className="rounded-full bg-white px-6 py-3 font-semibold text-ink ring-1 ring-slate-200"
                  >
                    {t("hasAccount")}
                  </Link>
                )}
              </div>
            </div>
            {qr ? (
              <div className="rounded-3xl bg-white p-4 text-center ring-1 ring-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt={t("qrAlt", { price: amount })}
                  className="mx-auto h-48 w-48 object-contain"
                />
                <p className="mt-2 text-xs font-semibold text-muted">
                  {t("qrHint", { price: amount })}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
