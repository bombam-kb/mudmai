"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { AiLabel, AiSparkle, BrandLockup, PillarIcon } from "@/components/icons";
import { AppearanceToggles } from "@/components/appearance-toggles";
import { OnboardingProgress } from "@/components/onboarding/progress";
import { RatingsStep } from "@/components/onboarding/ratings-step";
import { PromptGuide } from "@/components/onboarding/prompt-guide";
import { CompletenessCheck } from "@/components/onboarding/completeness-check";
import { PILLARS, PILLAR_MAP, type PillarId } from "@/lib/pillars";
import {
  type OnboardingDraft,
  type OnboardingTextField,
} from "@/lib/onboarding/schema";
import { TOTAL_STEPS, useOnboardingStore } from "@/stores/onboarding-store";

const TEXT_STEPS: { step: number; field: OnboardingTextField; accent: string }[] =
  [
    { step: 1, field: "lastYearStory", accent: "#8B5CF6" },
    { step: 2, field: "happiestMoment", accent: "#EC4899" },
    { step: 3, field: "keyLearnings", accent: "#2563EB" },
    { step: 4, field: "healingThings", accent: "#06B6D4" },
    { step: 6, field: "expectationsNextYear", accent: "#F97316" },
  ];

type Props = {
  lastYear: number;
  activeYear: number;
  initial: OnboardingDraft | null;
  demoMode: boolean;
};

export function OnboardingWizard({
  lastYear,
  activeYear,
  initial,
  demoMode,
}: Props) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const step = useOnboardingStore((state) => state.step);
  const lastYearStory = useOnboardingStore((state) => state.lastYearStory);
  const happiestMoment = useOnboardingStore((state) => state.happiestMoment);
  const keyLearnings = useOnboardingStore((state) => state.keyLearnings);
  const healingThings = useOnboardingStore((state) => state.healingThings);
  const expectationsNextYear = useOnboardingStore(
    (state) => state.expectationsNextYear,
  );
  const ratings = useOnboardingStore((state) => state.ratings);
  const hydratedFromServer = useOnboardingStore(
    (state) => state.hydratedFromServer,
  );
  const setStep = useOnboardingStore((state) => state.setStep);
  const setText = useOnboardingStore((state) => state.setText);
  const setRating = useOnboardingStore((state) => state.setRating);
  const hydrate = useOnboardingStore((state) => state.hydrate);
  const markCompleted = useOnboardingStore((state) => state.markCompleted);

  const draft: OnboardingDraft = {
    lastYearStory,
    happiestMoment,
    keyLearnings,
    healingThings,
    expectationsNextYear,
    ratings,
  };

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (initial && !hydratedFromServer) {
      hydrate(initial);
    }
  }, [hydrate, hydratedFromServer, initial]);

  const textStep = TEXT_STEPS.find((item) => item.step === step);

  function currentValid() {
    if (step === 0) return true;
    if (step === 5) {
      return PILLARS.every((pillar) => {
        const value = ratings[pillar.id];
        return value >= 1 && value <= 5;
      });
    }
    if (!textStep) return false;
    return draft[textStep.field].trim().length > 0;
  }

  async function onNext() {
    setError(null);
    if (!currentValid()) {
      setError(step === 5 ? t("ratingRequired") : t("required"));
      return;
    }
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }
    await save();
  }

  async function save() {
    setPending(true);
    setError(null);

    try {
      if (demoMode) {
        markCompleted();
        setDone(true);
        return;
      }

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        throw new Error("save failed");
      }

      markCompleted();
      setDone(true);
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="jr-page-wash min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Link href="/home">
          <BrandLockup />
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AppearanceToggles showSignOut />
        </div>
      </header>
      <main className={`mx-auto px-4 pb-16 ${textStep ? "max-w-6xl" : "max-w-3xl"}`}>
        <OnboardingProgress step={done ? TOTAL_STEPS - 1 : step} />
        {textStep && !done ? (
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section className="rounded-[2rem] bg-white/85 p-6 shadow-card ring-1 ring-white sm:p-8">
              {demoMode ? (
                <p className="mb-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {t("skipDemo")}
                </p>
              ) : null}
              <PromptStep
                field={textStep.field}
                accent={textStep.accent}
                value={draft[textStep.field]}
                onChange={(value) => setText(textStep.field, value)}
                lastYear={lastYear}
                activeYear={activeYear}
              />
              <div className="mt-6 lg:hidden">
                <PromptGuide field={textStep.field} accent={textStep.accent} />
              </div>
              {error ? (
                <p className="mt-4 text-sm text-physical">{error}</p>
              ) : null}
              <WizardNav
                step={step}
                pending={pending}
                onBack={() => setStep(step - 1)}
                onNext={onNext}
              />
            </section>
            <div className="hidden lg:block">
              <PromptGuide field={textStep.field} accent={textStep.accent} />
            </div>
          </div>
        ) : (
          <section className="mt-6 rounded-[2rem] bg-white/85 p-6 shadow-card ring-1 ring-white sm:p-8">
            {done ? (
              <Done
                onContinue={() => {
                  router.replace("/home");
                  router.refresh();
                }}
                onVision={() => {
                  router.replace("/vision");
                  router.refresh();
                }}
              />
            ) : (
              <>
                {demoMode ? (
                  <p className="mb-4 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {t("skipDemo")}
                  </p>
                ) : null}

                {step === 0 ? (
                  <Intro
                    lastYear={lastYear}
                    activeYear={activeYear}
                    onStart={() => setStep(1)}
                  />
                ) : null}

                {step === 5 ? (
                  <RatingsStep
                    ratings={ratings}
                    lastYear={lastYear}
                    onChange={(pillar: PillarId, value: number) =>
                      setRating(pillar, value)
                    }
                  />
                ) : null}

                {error ? (
                  <p className="mt-4 text-sm text-physical">{error}</p>
                ) : null}

                {step > 0 ? (
                  <WizardNav
                    step={step}
                    pending={pending}
                    onBack={() => setStep(step - 1)}
                    onNext={onNext}
                  />
                ) : null}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function Done({
  onContinue,
  onVision,
}: {
  onContinue: () => void;
  onVision: () => void;
}) {
  const t = useTranslations("onboarding.done");

  return (
    <div>
      <p className="text-personal" aria-hidden>
        <BrandLockup />
      </p>
      <p className="mt-3 text-sm font-semibold text-brand">
        <AiLabel size={16}>{t("aiBadge")}</AiLabel>
      </p>
      <h1 className="mt-4 font-display text-4xl text-ink">{t("title")}</h1>
      <p className="mt-3 max-w-xl text-lg text-muted">{t("body")}</p>
      <p className="mt-2 text-sm text-personal">{t("nextHint")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onVision}
          className="rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-card"
        >
          {t("ctaVision")}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full bg-white px-6 py-3 font-semibold text-ink ring-1 ring-slate-200"
        >
          {t("cta")}
        </button>
      </div>
    </div>
  );
}

function Intro({
  lastYear,
  activeYear,
  onStart,
}: {
  lastYear: number;
  activeYear: number;
  onStart: () => void;
}) {
  const t = useTranslations("onboarding.intro");
  const tp = useTranslations("pillars");

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-personal">
        {t("eyebrow", { activeYear })}
      </p>
      <h1 className="mt-3 font-display text-4xl leading-tight text-ink sm:text-5xl">
        {t("title", { lastYear })}
      </h1>
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-brand">
        <AiSparkle size={14} painted toColor={PILLAR_MAP.PERSONAL.color} />
        {t("aiBadge")}
      </p>
      <p className="mt-4 max-w-xl text-lg text-muted">{t("body")}</p>
      <p className="mt-6 text-sm text-muted">{t("pillarsHint")}</p>
      <ul className="mt-4 flex flex-wrap gap-3" aria-label={tp("legendLabel")}>
        {PILLARS.map((pillar) => (
          <li key={pillar.id} className="flex items-center gap-2">
            <span
              className="grid h-11 w-11 place-items-center rounded-2xl text-white"
              style={{ backgroundColor: pillar.color }}
              aria-hidden
            >
              <PillarIcon id={pillar.id} size={20} />
            </span>
            <span className="text-sm font-semibold text-ink">{tp(pillar.id)}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onStart}
        className="mt-8 rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-card"
      >
        {t("cta")}
      </button>
    </div>
  );
}

function WizardNav({
  step,
  pending,
  onBack,
  onNext,
}: {
  step: number;
  pending: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("onboarding");

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full bg-white px-5 py-3 font-semibold text-ink ring-1 ring-slate-200"
      >
        {t("back")}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={pending}
        className="rounded-full bg-brand px-6 py-3 font-semibold text-white disabled:opacity-60"
      >
        {pending
          ? t("saving")
          : step === TOTAL_STEPS - 1
            ? t("finish")
            : t("next")}
      </button>
    </div>
  );
}

function PromptStep({
  field,
  accent,
  value,
  onChange,
  lastYear,
  activeYear,
}: {
  field: OnboardingTextField;
  accent: string;
  value: string;
  onChange: (value: string) => void;
  lastYear: number;
  activeYear: number;
}) {
  const t = useTranslations(`onboarding.${field}`);

  return (
    <div>
      <p
        className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide"
        style={{ color: accent }}
      >
        {field === "healingThings" ? <AiSparkle size={14} painted toColor={accent} /> : null}
        {t("eyebrow", { activeYear })}
      </p>
      <h1 className="mt-2 font-display text-4xl text-ink">{t("title")}</h1>
      <p
        className={`mt-3 text-muted ${
          field === "healingThings"
            ? "rounded-2xl bg-cyan-50 px-3 py-3 text-cyan-900"
            : ""
        }`}
      >
        {t("hint")}
      </p>
      <textarea
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={10}
        placeholder={t("placeholder", { lastYear, activeYear })}
        className="mt-5 w-full rounded-3xl border border-slate-200 bg-white p-4 text-base leading-relaxed outline-none placeholder:text-slate-400 focus:ring-2"
        style={{ caretColor: accent }}
      />
      {field === "lastYearStory" || field === "expectationsNextYear" ? (
        <CompletenessCheck key={field} field={field} value={value} accent={accent} />
      ) : null}
    </div>
  );
}
