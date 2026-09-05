"use client";

import { useTranslations } from "next-intl";
import { NavIcon, type NavIconName } from "@/components/icons";
import { navLinkActive, useAppNav } from "@/components/app-nav";

const MOBILE_NAV: { href: string; key: NavIconName }[] = [
  { href: "/home", key: "home" },
  { href: "/goals", key: "goals" },
  { href: "/calendar", key: "calendar" },
  { href: "/reviews", key: "reviews" },
  { href: "/settings", key: "settings" },
];

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
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      aria-busy={showSpinner || undefined}
      aria-label={label}
      title={label}
      className={`jr-tab ${active ? "jr-tab-active" : ""} ${showSpinner ? "jr-tab-pending" : ""}`}
      onClick={(event) => {
        if (active) return;
        event.preventDefault();
        onNavigate(href);
      }}
    >
      <span className="jr-tab-icon">
        {showSpinner ? <TabSpinner /> : <NavIcon name={navKey} size={20} active={active} />}
      </span>
      <span className="jr-tab-label">{label}</span>
    </a>
  );
}

export function MobileBottomNav() {
  const t = useTranslations();
  const { pathname, targetHref, navigate } = useAppNav();

  return (
    <nav className="jr-bottom-nav hidden" aria-label={t("nav.tabs")}>
      <div className="jr-tab-row">
        {MOBILE_NAV.map((item) => {
          const active = navLinkActive(pathname, item.href);
          const pending = targetHref === item.href && !active;
          return (
            <MobileTab
              key={item.key}
              href={item.href}
              navKey={item.key}
              label={t(`nav.short.${item.key}`)}
              active={active}
              pending={pending}
              onNavigate={navigate}
            />
          );
        })}
      </div>
      <div className="jr-home-indicator" aria-hidden />
    </nav>
  );
}
