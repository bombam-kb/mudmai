"use client";

import dynamic from "next/dynamic";
import { useRouter } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { VisionDesktopNotice } from "@/components/vision/vision-notice";
import { signOutClient } from "@/lib/auth/sign-out-client";
import { useClientLayout } from "@/stores/appearance-store";

const VisionCanvas = dynamic(
  () => import("./canvas").then((mod) => mod.VisionCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center text-muted">
        Loading canvas…
      </div>
    ),
  },
);

type Props = {
  year: number;
  initialSnapshot: unknown | null;
  demoMode: boolean;
};

export function VisionBoard(props: Props) {
  const router = useRouter();
  const layout = useClientLayout();

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  if (layout !== "desktop") {
    return (
      <AppShell onSignOut={signOut}>
        {layout === "mobile" ? <VisionDesktopNotice /> : null}
      </AppShell>
    );
  }

  return (
    <AppShell variant="canvas" onSignOut={signOut}>
      <VisionCanvas {...props} />
    </AppShell>
  );
}
