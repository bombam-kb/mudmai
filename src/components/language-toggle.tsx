"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

const LABELS = {
  th: "ไทย",
  en: "EN",
} as const;

export function LanguageToggle() {
  const t = useTranslations("welcome");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(next: "th" | "en") {
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200"
      aria-label={t("language")}
    >
      {(["th", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
          lang={code}
          className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
            locale === code
              ? "bg-brand text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
