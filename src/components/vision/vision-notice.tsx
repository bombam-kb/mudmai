"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons";

export function VisionDesktopNotice() {
  const t = useTranslations("vision");
  const tn = useTranslations("nav");

  return (
    <section className="mx-auto max-w-md rounded-[2rem] bg-white p-6 text-center shadow-card ring-1 ring-slate-100">
      <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white">
        <NavIcon name="vision" size={22} />
      </span>
      <h1 className="font-display text-2xl text-ink">{t("desktopOnlyTitle")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">{t("desktopOnlyBody")}</p>
      <Link
        href="/home"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white"
      >
        {tn("home")}
      </Link>
    </section>
  );
}
