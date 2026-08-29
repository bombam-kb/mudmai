import { prisma } from "@/lib/prisma";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I — avoids look-alike codes

function randomCode(length = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

/** Lazily creates and persists a unique referral code for a user who doesn't have one yet. */
export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const updated = await prisma.user
      .update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
      })
      .catch(() => null);
    if (updated?.referralCode) return updated.referralCode;
  }
  throw new Error("referral_code_generation_failed");
}
