"use client";

import { useEffect } from "react";
import {
  applyAppearance,
  syncLayoutFromViewport,
  useAppearanceStore,
} from "@/stores/appearance-store";
import { useMobileKeyboard } from "@/hooks/use-mobile-keyboard";

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  useMobileKeyboard();
  useEffect(() => {
    const unsub = useAppearanceStore.subscribe((state) => applyAppearance(state));
    void useAppearanceStore.persist.rehydrate();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => applyAppearance();
    media.addEventListener("change", onScheme);
    const onResize = () => syncLayoutFromViewport();
    window.addEventListener("resize", onResize);
    syncLayoutFromViewport();
    return () => {
      unsub();
      media.removeEventListener("change", onScheme);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return children;
}
