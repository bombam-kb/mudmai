"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { AppLoader } from "@/components/app-loader";

const PREFETCH_HREFS = [
  "/home",
  "/vision",
  "/goals",
  "/calendar",
  "/reviews",
  "/settings",
] as const;

export function navLinkActive(pathname: string, href: string) {
  if (href === "/home") return pathname === "/home" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppNavContextValue = {
  pathname: string;
  targetHref: string | null;
  pending: boolean;
  navigate: (href: string) => void;
};

const AppNavContext = createContext<AppNavContextValue | null>(null);

export function useAppNav() {
  const value = useContext(AppNavContext);
  if (!value) {
    throw new Error("useAppNav must be used within AppNavProvider");
  }
  return value;
}

export function AppNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const [isNavigating, startNavigation] = useTransition();
  const pending = Boolean(targetHref) || isNavigating;

  useEffect(() => {
    for (const href of PREFETCH_HREFS) {
      router.prefetch(href);
    }
  }, [router]);

  useEffect(() => {
    if (!targetHref) return;
    if (navLinkActive(pathname, targetHref)) {
      setTargetHref(null);
    }
  }, [pathname, targetHref]);

  useEffect(() => {
    const root = document.documentElement;
    if (pending) root.dataset.navPending = "true";
    else delete root.dataset.navPending;
    return () => {
      delete root.dataset.navPending;
    };
  }, [pending]);

  const navigate = useCallback(
    (href: string) => {
      if (navLinkActive(pathname, href)) return;
      setTargetHref(href);
      startNavigation(() => {
        router.push(href, { scroll: false });
      });
    },
    [pathname, router],
  );

  return (
    <AppNavContext.Provider value={{ pathname, targetHref, pending, navigate }}>
      {children}
      {pending ? <NavLoadingOverlay /> : null}
    </AppNavContext.Provider>
  );
}

function NavLoadingOverlay() {
  const t = useTranslations("loader");
  const brand = useTranslations("brand");

  return (
    <div className="jr-nav-loader">
      <AppLoader brand={brand("name")} label={t("nav")} hint={t("navHint")} />
    </div>
  );
}
