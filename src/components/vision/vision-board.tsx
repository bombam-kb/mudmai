"use client";

import dynamic from "next/dynamic";
import { useRouter } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell";
import { signOutClient } from "@/lib/auth/sign-out-client";

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

  async function signOut() {
    await signOutClient();
    router.replace("/");
    router.refresh();
  }

  return (
    <AppShell variant="canvas" onSignOut={signOut}>
      <VisionCanvas {...props} />
    </AppShell>
  );
}
