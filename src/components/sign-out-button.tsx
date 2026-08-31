"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { signOutClient } from "@/lib/auth/sign-out-client";

export function SignOutButton({ className }: { className?: string }) {
  const t = useTranslations("home");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (pending) return;
    setPending(true);
    try {
      await signOutClient();
      router.replace("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={pending}
      className={
        className ??
        "jr-sign-out rounded-full bg-ink px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60 sm:px-3 sm:text-sm"
      }
    >
      {t("signOut")}
    </button>
  );
}
