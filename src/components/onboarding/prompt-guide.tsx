"use client";

import { useTranslations } from "next-intl";
import { AiSparkle } from "@/components/icons";
import type { OnboardingTextField } from "@/lib/onboarding/schema";

type Example = { label: string; body: string };

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function exampleList(value: unknown): Example[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { label?: unknown; body?: unknown };
    if (typeof row.label !== "string" || typeof row.body !== "string") return [];
    return [{ label: row.label, body: row.body }];
  });
}

export function PromptGuide({
  field,
  accent,
}: {
  field: OnboardingTextField;
  accent: string;
}) {
  const t = useTranslations(`onboarding.${field}`);
  const prompts = stringList(t.raw("prompts"));
  const examples = exampleList(t.raw("examples"));

  if (prompts.length === 0 && examples.length === 0) return null;

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      {prompts.length > 0 ? (
        <div className="rounded-[1.75rem] bg-white/90 p-5 shadow-card ring-1 ring-white">
          <p
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
            style={{ color: accent }}
          >
            {field === "healingThings" ? <AiSparkle size={12} painted toColor={accent} /> : null}
            {t("guideTitle")}
          </p>
          <p className="mt-2 text-sm text-muted">{t("guideIntro")}</p>
          <ul className="mt-3 space-y-2">
            {prompts.map((prompt) => (
              <li
                key={prompt}
                className="rounded-2xl bg-slate-50 px-3 py-2 text-sm leading-relaxed text-ink"
              >
                {prompt}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {examples.length > 0 ? (
        <div className="rounded-[1.75rem] bg-white/90 p-5 shadow-card ring-1 ring-white">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>
            {t("examplesTitle")}
          </p>
          <p className="mt-2 text-sm text-muted">{t("examplesHint")}</p>
          <div className="mt-3 space-y-3">
            {examples.map((example) => (
              <figure
                key={example.label}
                className="rounded-2xl px-3 py-3"
                style={{ backgroundColor: `${accent}14` }}
              >
                <figcaption className="text-xs font-semibold" style={{ color: accent }}>
                  {example.label}
                </figcaption>
                <blockquote className="mt-1 text-sm leading-relaxed text-ink">
                  {example.body}
                </blockquote>
              </figure>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
