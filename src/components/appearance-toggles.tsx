"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useAppearanceStore, type ThemeMode } from "@/stores/appearance-store";
import { LanguageToggle } from "@/components/language-toggle";
import { SignOutButton } from "@/components/sign-out-button";

type Size = "compact" | "panel";

export function AppearanceToggles({
  size = "compact",
  showSignOut = false,
  onSignOut,
}: {
  size?: Size;
  showSignOut?: boolean;
  onSignOut?: () => void;
}) {
  const t = useTranslations("settings");
  const theme = useAppearanceStore((state) => state.theme);
  const setTheme = useAppearanceStore((state) => state.setTheme);

  const fields = (
    <div className="grid gap-3">
      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-muted">{t("language")}</legend>
        <LanguageToggle className="inline-flex items-center gap-1 rounded-full bg-slate-50 p-1 ring-1 ring-slate-200" />
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-muted">{t("theme")}</legend>
        <Segmented
          ariaLabel={t("theme")}
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: t("themeLight"), icon: <SunIcon /> },
            { value: "dark", label: t("themeDark"), icon: <MoonIcon /> },
            { value: "system", label: t("themeSystem"), icon: <SystemIcon /> },
          ]}
        />
      </fieldset>
    </div>
  );

  if (size === "panel") {
    return (
      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-muted">{t("theme")}</legend>
        <Segmented
          ariaLabel={t("theme")}
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: t("themeLight"), icon: <SunIcon /> },
            { value: "dark", label: t("themeDark"), icon: <MoonIcon /> },
            { value: "system", label: t("themeSystem"), icon: <SystemIcon /> },
          ]}
        />
      </fieldset>
    );
  }

  return (
    <AppearanceMenu showSignOut={showSignOut} onSignOut={onSignOut}>
      {fields}
    </AppearanceMenu>
  );
}

function AppearanceMenu({
  children,
  showSignOut,
  onSignOut,
}: {
  children: ReactNode;
  showSignOut?: boolean;
  onSignOut?: () => void;
}) {
  const t = useTranslations("settings");
  const th = useTranslations("home");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t("appearanceMenu")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        title={t("appearanceMenu")}
        onClick={() => setOpen((value) => !value)}
        className={`grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition ${
          open ? "text-brand ring-brand/40" : "text-ink hover:text-brand"
        }`}
      >
        <GearIcon />
      </button>
      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-label={t("appearanceMenu")}
          className="absolute right-0 top-full z-40 mt-2 min-w-[13.5rem] rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-100"
        >
          {children}
          {showSignOut ? (
            <div className="mt-3 border-t border-slate-100 pt-3">
              {onSignOut ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="jr-sign-out w-full rounded-full bg-ink px-3 py-2 text-sm font-semibold text-white"
                >
                  {th("signOut")}
                </button>
              ) : (
                <SignOutButton className="jr-sign-out w-full rounded-full bg-ink px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" />
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Segmented({
  ariaLabel,
  value,
  onChange,
  options,
}: {
  ariaLabel: string;
  value: ThemeMode;
  onChange: (value: ThemeMode) => void;
  options: { value: ThemeMode; label: string; icon: ReactNode }[];
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-full bg-slate-50 p-1 ring-1 ring-slate-200"
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={`grid h-8 w-8 place-items-center rounded-full transition ${
              selected ? "bg-brand text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10.3 3.4a2 2 0 0 1 3.4 0l.2.4a2 2 0 0 0 2.5 1l.4-.2a2 2 0 0 1 2.7 2.7l-.2.4a2 2 0 0 0 1 2.5l.4.2a2 2 0 0 1 0 3.4l-.4.2a2 2 0 0 0-1 2.5l.2.4a2 2 0 0 1-2.7 2.7l-.4-.2a2 2 0 0 0-2.5 1l-.2.4a2 2 0 0 1-3.4 0l-.2-.4a2 2 0 0 0-2.5-1l-.4.2a2 2 0 0 1-2.7-2.7l.2-.4a2 2 0 0 0-1-2.5l-.4-.2a2 2 0 0 1 0-3.4l.4-.2a2 2 0 0 0 1-2.5l-.2-.4a2 2 0 0 1 2.7-2.7l.4.2a2 2 0 0 0 2.5-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3v1.5M12 19.5V21M4.9 4.9l1.1 1.1M18 18l1.1 1.1M3 12h1.5M19.5 12H21M4.9 19.1 6 18M18 6l1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16.5 13.5A7 7 0 0 1 10 5a7 7 0 1 0 8.5 10.2 5.5 5.5 0 0 1-2-1.7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" />
    </svg>
  );
}
