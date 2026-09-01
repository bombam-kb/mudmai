"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons";

type Props = {
  variant?: "row" | "card";
};

export function VisionEntry({ variant = "card" }: Props) {
  const t = useTranslations("vision");

  if (variant === "row") {
    return (
      <Link href="/vision" className="jr-more-row jr-vision-entry">
        <span className="jr-more-icon bg-brand text-white">
          <NavIcon name="vision" size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">{t("entry")}</span>
          <span className="block text-xs font-normal text-muted">{t("entryHint")}</span>
        </span>
      </Link>
    );
  }

  return (
    <Link href="/vision" className="jr-vision-card jr-vision-entry my-4 items-center gap-3 rounded-3xl bg-white p-4 shadow-card ring-1 ring-slate-100">
      <span className="jr-more-icon bg-brand text-white">
        <NavIcon name="vision" size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{t("entry")}</span>
        <span className="block text-xs font-normal text-muted">{t("entryHint")}</span>
      </span>
    </Link>
  );
}
