"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { AppearanceToggles } from "./appearance-toggles";
import { ReminderWatcher } from "@/components/reminders/watcher";
import { PdpaBanner } from "@/components/pdpa/banner";
import { ClientStoreBinder } from "@/components/client-store-binder";
import { NudgeWatcher } from "@/components/nudge/watcher";
import { BrandLockup, type NavIconName } from "@/components/icons";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

const DESKTOP_NAV: { href: string; key: NavIconName }[] = [
  { href: "/home", key: "home" },
  { href: "/vision", key: "vision" },
  { href: "/goals", key: "goals" },
  { href: "/calendar", key: "calendar" },
  { href: "/reviews", key: "reviews" },
  { href: "/settings", key: "settings" },
];

function navLinkActive(pathname: string, href: string) {
  if (href === "/home") return pathname === "/home" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  name?: string | null;
  children: React.ReactNode;
  onSignOut?: () => void;
  variant?: "default" | "canvas";
};

export function AppShell({ name, children, onSignOut, variant = "default" }: Props) {
  const t = useTranslations();
  const pathname = usePathname();
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
          <Link href="/home" className="min-w-0">
            <BrandLockup />
          </Link>
          <nav className="jr-top-nav hidden items-center gap-1 overflow-x-auto text-sm font-medium">
            {DESKTOP_NAV.map((item) => {
              const active = navLinkActive(pathname, item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`jr-top-nav-link ${active ? "is-active" : ""}`}
                >
                  {t(`nav.${item.key}`)}
                </Link>
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
