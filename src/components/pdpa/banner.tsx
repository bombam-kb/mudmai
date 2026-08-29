"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { PDPA_STORAGE_KEY } from "@/lib/pdpa";

export function PdpaBanner() {
  const t = useTranslations("pdpa");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured()) return;
    if (pathname.startsWith("/privacy")) return;
    if (localStorage.getItem(PDPA_STORAGE_KEY)) return;
    setOpen(true);
  }, [pathname]);

  if (!open) return null;

  function accept() {
    localStorage.setItem(PDPA_STORAGE_KEY, new Date().toISOString());
    setOpen(false);
  }

  return (
    <div className="jr-pdpa-banner fixed inset-x-0 z-30 mx-auto max-w-3xl px-3">
      <div className="rounded-3xl bg-ink p-4 text-white shadow-card">
        <p className="text-sm leading-relaxed">{t("banner")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/privacy"
            className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold"
          >
            {t("link")}
          </Link>
          <button
            type="button"
            onClick={accept}
            className="rounded-full bg-brand px-3 py-1.5 text-sm font-semibold"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
