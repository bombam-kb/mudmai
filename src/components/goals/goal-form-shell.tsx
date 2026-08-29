"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { signOutClient } from "@/lib/auth/sign-out-client";

type Props = {
  demoMode: boolean;
  titleKey: "create" | "edit";
  children: React.ReactNode;
};

export function GoalFormShell({ demoMode, titleKey, children }: Props) {
  const t = useTranslations("goals");
  const router = useRouter();

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  return (
    <AppShell onSignOut={signOut}>
      <div className="mb-6">
        <Link href="/goals" className="text-sm font-semibold text-brand">
          ← {t("back")}
        </Link>
        <h1 className="mt-2 font-display text-4xl">{t(titleKey)}</h1>
        <p className="mt-2 max-w-xl text-muted">{t(`${titleKey}Hint`)}</p>
      </div>
      {children}
    </AppShell>
  );
}
