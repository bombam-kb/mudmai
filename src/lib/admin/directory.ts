import { prisma } from "@/lib/prisma";
import { isLinePlaceholderEmail } from "@/lib/line/oauth";
import { unlinkLineAccount } from "@/lib/line/account";

export type AdminCheckoutDto = {
  id: string;
  status: "PENDING" | "PAID";
  plan: "FOUNDER" | "YEARLY";
  amountThb: number;
  paidViaPoints: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
};

export type AdminLineLinkDto = {
  id: string;
  userId: string;
  email: string;
  name: string;
  lineUserId: string;
  reachable: boolean;
  reminderOptIn: boolean;
  broadcastOptIn: boolean;
  linkedAt: string;
  friendAt: string | null;
  unfollowedAt: string | null;
  lineOnly: boolean;
};

export type AdminMemberDto = {
  id: string;
  name: string;
  email: string;
  lineUserId: string | null;
  reachable: boolean;
  lineOnly: boolean;
  linkedAt: string | null;
  createdAt: string;
};

export async function listAdminCheckouts(limit = 200): Promise<AdminCheckoutDto[]> {
  const rows = await prisma.billingCheckout.findMany({
    include: {
      user: { select: { id: true, email: true, name: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    plan: row.plan,
    amountThb: row.amountThb,
    paidViaPoints: row.paidViaPoints,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    user: {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      createdAt: row.user.createdAt.toISOString(),
    },
  }));
}

export async function listAdminMembers(limit = 500): Promise<AdminMemberDto[]> {
  const rows = await prisma.user.findMany({
    include: {
      lineAccount: {
        select: {
          lineUserId: true,
          reachable: true,
          linkedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    lineUserId: row.lineAccount?.lineUserId ?? null,
    reachable: row.lineAccount?.reachable ?? false,
    lineOnly: isLinePlaceholderEmail(row.email),
    linkedAt: row.lineAccount?.linkedAt.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listAdminLineLinks(limit = 200): Promise<AdminLineLinkDto[]> {
  const rows = await prisma.lineAccount.findMany({
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { linkedAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    email: row.user.email,
    name: row.user.name,
    lineUserId: row.lineUserId,
    reachable: row.reachable,
    reminderOptIn: row.reminderOptIn,
    broadcastOptIn: row.broadcastOptIn,
    linkedAt: row.linkedAt.toISOString(),
    friendAt: row.friendAt?.toISOString() ?? null,
    unfollowedAt: row.unfollowedAt?.toISOString() ?? null,
    lineOnly: isLinePlaceholderEmail(row.user.email),
  }));
}

export async function adminUnlinkLine(input: { userId?: string; lineUserId?: string }) {
  let userId = input.userId?.trim() || "";
  if (!userId && input.lineUserId) {
    const row = await prisma.lineAccount.findUnique({
      where: { lineUserId: input.lineUserId.trim() },
      select: { userId: true },
    });
    userId = row?.userId ?? "";
  }
  if (!userId) return { ok: false as const, reason: "missing" as const };
  const count = await unlinkLineAccount(userId);
  if (count === 0) return { ok: false as const, reason: "not_found" as const };
  return { ok: true as const, userId };
}
