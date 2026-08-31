import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@prisma/client";
import { applyReferral } from "@/lib/referrals/service";

export async function ensureProfile(
  user: User,
  preferredLocale: Locale = "th",
) {
  if (!process.env.DATABASE_URL || !user.email) return null;

  const existing = await prisma.user.findUnique({ where: { id: user.id } });
  if (existing) {
    if (existing.email === user.email) return existing;
    return prisma.user.update({
      where: { id: user.id },
      data: { email: user.email },
    });
  }

  const name =
    (user.user_metadata?.name as string | undefined)?.trim() ||
    user.email.split("@")[0];

  const created = await prisma.user.create({
    data: {
      id: user.id,
      email: user.email,
      name,
      preferredLocale,
    },
  });

  const referralCode = (user.user_metadata?.referralCode as string | undefined)?.trim();
  if (referralCode) {
    await applyReferral({
      code: referralCode,
      referredUserId: created.id,
      referredEmail: created.email,
    }).catch(() => null);
  }

  return created;
}
