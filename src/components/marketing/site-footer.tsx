"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function MarketingFooter() {
  const t = useTranslations("nav");
  const brand = useTranslations("brand");

  return (
    <footer className="mx-auto mt-8 max-w-6xl px-4 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/70 pt-6 text-sm text-muted">
        <p className="font-semibold text-ink">{brand("name")}</p>
        <nav className="flex flex-wrap gap-4 font-semibold">
          <Link href="/pricing" className="hover:text-ink">
            {t("pricing")}
          </Link>
          <Link href="/promo" className="hover:text-ink">
            {t("promo")}
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            {t("privacy")}
          </Link>
          <Link href="/login" className="hover:text-ink">
            {t("login")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
