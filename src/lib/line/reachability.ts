import { prisma } from "@/lib/prisma";
import { isLineMessagingConfigured } from "@/lib/env";

/** Returns whether the OA can message this user; null if the probe could not run. */
export async function probeLineReachable(lineUserId: string): Promise<boolean | null> {
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!isLineMessagingConfigured() || !token) return null;

  const response = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);

  if (!response) return null;
  if (response.ok) return true;
  if (response.status === 404 || response.status === 403) return false;
  return null;
}

export async function refreshLineReachability(userId: string) {
  const account = await prisma.lineAccount.findUnique({
    where: { userId },
    select: { lineUserId: true, reachable: true },
  });
  if (!account) return false;

  const probed = await probeLineReachable(account.lineUserId);
  if (probed === null || probed === account.reachable) return probed ?? account.reachable;

  await prisma.lineAccount.update({
    where: { userId },
    data: probed
      ? { reachable: true, friendAt: new Date(), unfollowedAt: null }
      : { reachable: false, unfollowedAt: new Date() },
  });
  return probed;
}
