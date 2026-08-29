"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AppLoader } from "@/components/app-loader";

const SPLASH_KEY = "jr-splash-seen";
const SPLASH_MS = 1800;
const FADE_MS = 420;

export function AppSplash({ children }: { children: React.ReactNode }) {
  const t = useTranslations("loader");
  const brand = useTranslations("brand");
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (sessionStorage.getItem(SPLASH_KEY) || reduced) {
      setVisible(false);
      return;
    }

    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        setLeaving(true);
        timers.push(
          window.setTimeout(() => {
            sessionStorage.setItem(SPLASH_KEY, "1");
            setVisible(false);
          }, FADE_MS),
        );
      }, SPLASH_MS),
    );

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  return (
    <>
      {children}
      {visible ? (
        <div
          className={`jr-splash fixed inset-0 z-[80] transition-opacity duration-300 ${
            leaving ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <AppLoader brand={brand("name")} label={t("label")} hint={t("hint")} />
        </div>
      ) : null}
    </>
  );
}
