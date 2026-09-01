"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useAppearanceStore } from "@/stores/appearance-store";

type Props = {
  title: ReactNode;
  meta?: ReactNode;
  preview?: ReactNode;
  defaultOpen?: boolean;
  startCollapsed?: boolean;
  titleClassName?: string;
  children: ReactNode;
};

export function MobileFold({
  title,
  meta,
  preview,
  defaultOpen = false,
  startCollapsed = false,
  titleClassName = "font-display text-2xl text-ink",
  children,
}: Props) {
  const t = useTranslations("ui");
  const layout = useAppearanceStore((state) => state.layout);
  const [open, setOpen] = useState(
    defaultOpen || (!startCollapsed && layout !== "mobile"),
  );

  useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
      return;
    }
    if (startCollapsed) {
      setOpen(false);
      return;
    }
    setOpen(layout === "desktop");
  }, [defaultOpen, layout, startCollapsed]);

  return (
    <div className={`jr-fold ${open ? "jr-fold-open" : "jr-fold-collapsed"}`}>
      <button
        type="button"
        className="jr-fold-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`min-w-0 flex-1 text-left ${titleClassName}`}>{title}</span>
        {meta ? <span className="jr-fold-meta shrink-0">{meta}</span> : null}
        <span className="jr-fold-action">{open ? t("collapse") : t("expand")}</span>
        <span className="jr-fold-chevron" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6.5 8 10.5 12 6.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {preview ? <div className="jr-fold-preview">{preview}</div> : null}
      <div className="jr-fold-body">{children}</div>
    </div>
  );
}
