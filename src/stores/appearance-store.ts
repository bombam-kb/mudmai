"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const APPEARANCE_STORAGE_KEY = "jr-appearance";

export type ThemeMode = "light" | "dark" | "system";
export type LayoutMode = "mobile" | "desktop";

type AppearanceState = {
  theme: ThemeMode;
  layout: LayoutMode;
  layoutChosen: boolean;
  setTheme: (theme: ThemeMode) => void;
  setLayout: (layout: LayoutMode) => void;
};

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Viewport default unless the user explicitly picked mobile or desktop. */
export function resolveLayout(
  stored: { layout?: unknown; layoutChosen?: unknown } | null | undefined,
  viewportWidth: number,
): LayoutMode {
  if (
    stored?.layoutChosen === true &&
    (stored.layout === "mobile" || stored.layout === "desktop")
  ) {
    return stored.layout;
  }
  return viewportWidth >= 768 ? "desktop" : "mobile";
}

export function resolvedTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return theme === "dark" ? "dark" : "light";
  if (theme === "system") return systemDark() ? "dark" : "light";
  return theme;
}

export function applyAppearance(state?: Pick<AppearanceState, "theme" | "layout">) {
  if (typeof document === "undefined") return;
  const current = state ?? useAppearanceStore.getState();
  const dark = resolvedTheme(current.theme) === "dark";
  const html = document.documentElement;
  html.classList.toggle("dark", dark);
  html.dataset.layout = current.layout;
  html.style.colorScheme = dark ? "dark" : "light";
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      theme: "system",
      layout: "desktop",
      layoutChosen: false,
      setTheme: (theme) => set({ theme }),
      setLayout: (layout) => set({ layout, layoutChosen: true }),
    }),
    {
      name: APPEARANCE_STORAGE_KEY,
      skipHydration: true,
      partialize: (state) => ({
        theme: state.theme,
        layout: state.layout,
        layoutChosen: state.layoutChosen,
      }),
      onRehydrateStorage: () => (state) => {
        if (typeof window === "undefined") return;
        const theme = state?.theme ?? "system";
        const layout = resolveLayout(state, window.innerWidth);
        const layoutChosen = state?.layoutChosen === true;
        useAppearanceStore.setState({ layout, layoutChosen, theme });
        applyAppearance({ theme, layout });
      },
    },
  ),
);

export function useResolvedTheme(): "light" | "dark" {
  const theme = useAppearanceStore((state) => state.theme);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setDark(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  if (theme === "system") return dark ? "dark" : "light";
  return theme;
}

export const APPEARANCE_BOOT = `(function(){try{var k=${JSON.stringify(APPEARANCE_STORAGE_KEY)};var theme="system";var layout=window.innerWidth>=768?"desktop":"mobile";var raw=localStorage.getItem(k);if(raw){var p=JSON.parse(raw);var s=p.state||p;if(s.theme==="light"||s.theme==="dark"||s.theme==="system")theme=s.theme;if(s.layoutChosen===true&&(s.layout==="mobile"||s.layout==="desktop"))layout=s.layout;}var dark=theme==="dark"||(theme==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var h=document.documentElement;h.classList.toggle("dark",dark);h.setAttribute("data-layout",layout);h.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;
