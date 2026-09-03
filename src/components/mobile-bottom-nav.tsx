"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavIcon, type NavIconName } from "@/components/icons";

const MOBILE_NAV: { href: string; key: NavIconName }[] = [
  { href: "/home", key: "home" },
  { href: "/goals", key: "goals" },
  { href: "/calendar", key: "calendar" },
  { href: "/reviews", key: "reviews" },
  { href: "/settings", key: "settings" },
];

function tabActive(pathname: string, href: string) {
  if (href === "/home") return pathname === "/home" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabSpinner() {
  return (
    <span className="jr-tab-spinner" aria-hidden>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="28 56"
        />
      </svg>
    </span>
  );
}

type TabProps = {
  href: string;
  navKey: NavIconName;
  label: string;
  active: boolean;
  pending: boolean;
  onNavigate: (href: string) => void;
};

function MobileTab({ href, navKey, label, active, pending, onNavigate }: TabProps) {
  const showSpinner = pending && !active;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-busy={showSpinner || undefined}
      aria-label={label}
      title={label}
      className={`jr-tab ${active ? "jr-tab-active" : ""} ${showSpinner ? "jr-tab-pending" : ""}`}
      onClick={() => {
        if (!active) onNavigate(href);
      }}
    >
      <span className="jr-tab-icon">
        {showSpinner ? <TabSpinner /> : <NavIcon name={navKey} size={20} active={active} />}
      </span>
      <span className="jr-tab-label">{label}</span>
    </Link>
  );
}

export function MobileBottomNav() {
  const t = useTranslations();
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingHref) return;
    if (tabActive(pathname, pendingHref)) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  useEffect(() => {
    const root = document.documentElement;
    if (pendingHref) {
      root.dataset.navPending = "true";
    } else {
      delete root.dataset.navPending;
    }
    return () => {
      delete root.dataset.navPending;
    };
  }, [pendingHref]);

  return (
    <nav className="jr-bottom-nav hidden" aria-label={t("nav.tabs")}>
      <div className="jr-tab-row">
        {MOBILE_NAV.map((item) => {
          const active = tabActive(pathname, item.href);
          const pending = pendingHref === item.href;
          return (
            <MobileTab
              key={item.key}
              href={item.href}
              navKey={item.key}
              label={t(`nav.short.${item.key}`)}
              active={active}
              pending={pending}
              onNavigate={setPendingHref}
            />
          );
        })}
      </div>
      <div className="jr-home-indicator" aria-hidden />
    </nav>
  );
}
