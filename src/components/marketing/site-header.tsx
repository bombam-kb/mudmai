"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageToggle } from "@/components/language-toggle";
import { AppearanceToggles } from "@/components/appearance-toggles";
import { BrandLockup } from "@/components/icons";

type Props = {
  signedIn?: boolean;
};

export function MarketingHeader({ signedIn = false }: Props) {
  const t = useTranslations("nav");

  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5">
      <Link href="/" className="min-w-0 shrink-0">
        <BrandLockup />
      </Link>
      <nav className="hidden items-center gap-5 text-sm font-semibold text-muted sm:flex">
        <Link href="/#pillars" className="hover:text-ink">
          {t("pillars")}
        </Link>
        <Link href="/#how" className="hover:text-ink">
          {t("how")}
        </Link>
        <Link href="/#features" className="hover:text-ink">
          {t("features")}
        </Link>
        <Link href="/pricing" className="hover:text-ink">
          {t("pricing")}
        </Link>
      </nav>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AppearanceToggles />
        <LanguageToggle />
        {signedIn ? (
          <Link
            href="/home"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card"
          >
            {t("app")}
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-slate-200 sm:inline"
            >
              {t("login")}
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card"
            >
              {t("start")}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
