"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { RatingsPicker } from "@/components/reviews/ratings-picker";
import { Link, useRouter } from "@/i18n/navigation";
import { signOutClient } from "@/lib/auth/sign-out-client";
import type { OnboardingRatings } from "@/lib/onboarding/schema";
import type { PillarId } from "@/lib/pillars";
import {
  emptyMonthly,
  type MonthlyReviewDto,
  type MonthlyReviewInput,
} from "@/lib/reviews/schema";
import { useReviewsStore } from "@/stores/reviews-store";
import { useNudgeStore } from "@/stores/nudge-store";
import { useOnboardingStore } from "@/stores/onboarding-store";

type Props = {
  name: string;
  demoMode: boolean;
  year: number;
  month: number;
  initial: MonthlyReviewDto | null;
};

export function MonthlyReviewForm({ name, demoMode, year, month, initial }: Props) {
  const t = useTranslations("reviews");
  const tc = useTranslations("calendar");
  const locale = useLocale() === "en" ? "en" : "th";
  const router = useRouter();
  const [form, setForm] = useState<MonthlyReviewInput>(
    initial ?? emptyMonthly(year, month),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  async function save() {
    setSaving(true);
    setError(false);
    try {
      if (demoMode) {
        useReviewsStore.getState().upsertMonthly({
          ...form,
          id: initial?.id ?? crypto.randomUUID(),
        });
        const onboarding = useOnboardingStore.getState();
        useNudgeStore.getState().evaluateDemo({
          locale,
          reflection: {
            healingThings: onboarding.healingThings,
            happiestMoment: onboarding.happiestMoment,
            expectationsNextYear: onboarding.expectationsNextYear,
          },
          monthly: { year: form.year, month: form.month, ratings: form.ratings },
          weekTodos: [],
          weekFrom: `${form.year}-${String(form.month).padStart(2, "0")}-01`,
          weekTo: `${form.year}-${String(form.month).padStart(2, "0")}-01`,
        });
        router.push("/reviews");
        return;
      }
      const response = await fetch("/api/reviews/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await response.json()) as { ok: boolean };
      if (!json.ok) throw new Error("save");
      router.push("/reviews");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  function setRating(pillar: PillarId, value: number) {
    setForm((current) => ({
      ...current,
      ratings: { ...current.ratings, [pillar]: value } as OnboardingRatings,
    }));
  }

  return (
    <AppShell name={name} onSignOut={signOut}>
      <Link href="/reviews" className="text-sm font-semibold text-brand">
        ← {t("back")}
      </Link>
      <h1 className="mt-2 font-display text-4xl">
        {t("monthlyTitle", { month: tc(`months.${month}`), year })}
      </h1>
      <p className="mt-2 text-muted">{t("monthlyHint")}</p>

      {demoMode ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("demo")}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4">
        {(
          [
            ["whatILovedMost", "loved"],
            ["whatToStop", "stop"],
            ["whatToContinue", "continue"],
          ] as const
        ).map(([field, key]) => (
          <label key={field} className="block rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100">
            <span className="font-semibold">{t(key)}</span>
            <textarea
              value={form[field]}
              onChange={(event) =>
                setForm((current) => ({ ...current, [field]: event.target.value }))
              }
              rows={4}
              className="mt-2 w-full resize-y rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
            />
          </label>
        ))}
        <div>
          <h2 className="mb-3 font-display text-2xl">{t("ratings")}</h2>
          <RatingsPicker ratings={form.ratings} onChange={setRating} />
        </div>
        {error ? <p className="text-sm text-red-600">{t("error")}</p> : null}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-full bg-brand px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>
    </AppShell>
  );
}
