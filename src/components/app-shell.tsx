"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppearanceToggles } from "./appearance-toggles";
import { ReminderWatcher } from "@/components/reminders/watcher";
import { PdpaBanner } from "@/components/pdpa/banner";
import { ClientStoreBinder } from "@/components/client-store-binder";
import { NudgeWatcher } from "@/components/nudge/watcher";
import { BrandLockup, type NavIconName } from "@/components/icons";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { navLinkActive, useAppNav } from "@/components/app-nav";

const DESKTOP_NAV: { href: string; key: NavIconName }[] = [
  { href: "/home", key: "home" },
  { href: "/vision", key: "vision" },
  { href: "/goals", key: "goals" },
  { href: "/calendar", key: "calendar" },
  { href: "/reviews", key: "reviews" },
  { href: "/settings", key: "settings" },
];

function DesktopNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  const { navigate } = useAppNav();

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-busy={!active ? undefined : false}
      className={`jr-top-nav-link ${active ? "is-active" : ""}`}
      onClick={(event) => {
        if (active) return;
        event.preventDefault();
        navigate(href);
      }}
    >
      {label}
    </Link>
  );
}

function BrandHomeLink() {
  const { pathname, navigate } = useAppNav();

  return (
    <Link
      href="/home"
      className="min-w-0"
      onClick={(event) => {
        if (navLinkActive(pathname, "/home")) return;
        event.preventDefault();
        navigate("/home");
      }}
    >
      <BrandLockup />
    </Link>
  );
}

function AppShellFrame({
  name,
  children,
  onSignOut,
  variant = "default",
}: {
  name?: string | null;
  children: React.ReactNode;
  onSignOut?: () => void;
  variant?: "default" | "canvas";
}) {
  const t = useTranslations();
  const { pathname } = useAppNav();
  const canvas = variant === "canvas";

  return (
    <div
      className={
        canvas
          ? "jr-shell flex h-dvh flex-col overflow-hidden bg-canvas"
          : "jr-shell min-h-dvh bg-[radial-gradient(circle_at_top_right,_#ede9fe,_transparent_32%),radial-gradient(circle_at_bottom_left,_#dbeafe,_transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,_#312e81,_transparent_36%),radial-gradient(circle_at_bottom_left,_#0f3a4a,_transparent_32%)]"
      }
    >
      <header className="jr-header sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur">
        <div className="jr-header-inner mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <BrandHomeLink />
          <nav className="jr-top-nav hidden items-center gap-1 overflow-x-auto text-sm font-medium">
            {DESKTOP_NAV.map((item) => {
              const active = navLinkActive(pathname, item.href);
              return (
                <DesktopNavLink
                  key={item.key}
                  href={item.href}
                  label={t(`nav.${item.key}`)}
                  active={active}
                />
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <AppearanceToggles showSignOut onSignOut={onSignOut} />
          </div>
        </div>
      </header>
      <main
        className={
          canvas
            ? "jr-main-canvas flex min-h-0 flex-1 flex-col"
            : "jr-main mx-auto max-w-6xl px-4 py-8"
        }
      >
        {name && !canvas ? (
          <p className="jr-shell-hello mb-6 font-display text-3xl text-ink">
            {t("home.hello", { name })}
          </p>
        ) : null}
        {children}
      </main>
      <MobileBottomNav />
      <PdpaBanner />
      <ReminderWatcher />
      <NudgeWatcher />
      <ClientStoreBinder />
    </div>
  );
}

export function AppShell({
  name,
  children,
  onSignOut,
  variant = "default",
}: {
  name?: string | null;
  children: React.ReactNode;
  onSignOut?: () => void;
  variant?: "default" | "canvas";
}) {
  return (
    <AppShellFrame name={name} onSignOut={onSignOut} variant={variant}>
      {children}
    </AppShellFrame>
  );
}
