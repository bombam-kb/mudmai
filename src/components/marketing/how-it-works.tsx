import { getTranslations } from "next-intl/server";

const STEPS = [
  { key: "how1", accent: "#8B5CF6" },
  { key: "how2", accent: "#EC4899" },
  { key: "how3", accent: "#2563EB" },
  { key: "how4", accent: "#06B6D4" },
] as const;

export async function HowItWorks() {
  const t = await getTranslations("marketing");

  return (
    <section id="how" className="jr-how mx-auto max-w-6xl scroll-mt-24 px-4 pb-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-personal">
        {t("howEyebrow")}
      </p>
      <h2 className="mt-2 font-display text-4xl">{t("howTitle")}</h2>
      <div className="jr-how-flow mt-8">
        <div className="jr-how-rail" aria-hidden>
          <span className="jr-how-line" />
          <span className="jr-how-runner" />
        </div>
        <ol className="jr-how-steps">
          {STEPS.map((step, index) => (
            <li key={step.key} className={`jr-how-step jr-how-s${index + 1}`}>
              <article className="jr-how-card">
                <span
                  className="jr-how-node"
                  style={{ ["--jr-how-accent" as string]: step.accent }}
                >
                  {index + 1}
                </span>
                <p className="font-display text-ink">{t(`${step.key}Title`)}</p>
                <p className="jr-how-body mt-2 text-muted">{t(`${step.key}Body`)}</p>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
