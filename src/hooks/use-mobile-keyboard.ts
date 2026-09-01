"use client";

import { useEffect } from "react";

const KEYBOARD_THRESHOLD = 80;

function syncKeyboardInset() {
  const html = document.documentElement;
  const viewport = window.visualViewport;
  if (!viewport || html.dataset.layout !== "mobile") {
    html.style.setProperty("--jr-kb-inset", "0px");
    delete html.dataset.keyboard;
    return;
  }

  const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
  const open = inset > KEYBOARD_THRESHOLD;
  html.style.setProperty("--jr-kb-inset", `${open ? inset : 0}px`);
  if (open) html.dataset.keyboard = "open";
  else delete html.dataset.keyboard;
}

/** Hides the floating tab bar while the software keyboard is open. */
export function useMobileKeyboard() {
  useEffect(() => {
    const viewport = window.visualViewport;
    syncKeyboardInset();
    viewport?.addEventListener("resize", syncKeyboardInset);
    viewport?.addEventListener("scroll", syncKeyboardInset);
    window.addEventListener("resize", syncKeyboardInset);
    window.addEventListener("focusin", syncKeyboardInset);
    window.addEventListener("focusout", syncKeyboardInset);
    return () => {
      viewport?.removeEventListener("resize", syncKeyboardInset);
      viewport?.removeEventListener("scroll", syncKeyboardInset);
      window.removeEventListener("resize", syncKeyboardInset);
      window.removeEventListener("focusin", syncKeyboardInset);
      window.removeEventListener("focusout", syncKeyboardInset);
      document.documentElement.style.removeProperty("--jr-kb-inset");
      delete document.documentElement.dataset.keyboard;
    };
  }, []);
}
