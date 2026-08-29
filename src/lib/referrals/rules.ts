/** Pure decision logic for referrals — no I/O, so it's cheap to unit test directly. */

export type ReferralRejectReason = "SELF" | "SELF_EMAIL_ALIAS" | "DUPLICATE";

export type ReferralEligibilityInput = {
  affiliateUserId: string;
  referredUserId: string;
  affiliateEmail: string;
  referredEmail: string;
  /** true if this new account already has a Referral row (discount already granted once). */
  alreadyReferred: boolean;
};

export type ReferralEligibilityResult =
  | { ok: true }
  | { ok: false; reason: ReferralRejectReason };

/** Lowercases and strips `+tag` local-part addressing so alias signups can't self-refer. */
export function normalizeEmail(email: string): string {
  const lower = email.trim().toLowerCase();
  const at = lower.indexOf("@");
  if (at < 0) return lower;
  const local = lower.slice(0, at);
  const domain = lower.slice(at + 1);
  const plus = local.indexOf("+");
  const normalizedLocal = plus >= 0 ? local.slice(0, plus) : local;
  return `${normalizedLocal}@${domain}`;
}

export function evaluateReferralEligibility(
  input: ReferralEligibilityInput,
): ReferralEligibilityResult {
  if (input.alreadyReferred) {
    return { ok: false, reason: "DUPLICATE" };
  }
  if (input.affiliateUserId === input.referredUserId) {
    return { ok: false, reason: "SELF" };
  }
  if (normalizeEmail(input.affiliateEmail) === normalizeEmail(input.referredEmail)) {
    return { ok: false, reason: "SELF_EMAIL_ALIAS" };
  }
  return { ok: true };
}

/** 1:1 baht peg — the affiliate earns exactly the discount value they gave away. */
export function pointsForPayment(discountThb: number): number {
  return discountThb;
}

/** Points are only ever earned once a referral's linked checkout is confirmed PAID. */
export function referralUnlocksPoints(referral: { paidAt: Date | null }): boolean {
  return referral.paidAt === null;
}

export type RedemptionRejectReason = "INSUFFICIENT_POINTS" | "YEARLY_CAP_REACHED";

export type RedemptionEligibilityInput = {
  balance: number;
  costThb: number;
  /** true if this account already redeemed a free renewal in the current calendar year. */
  redeemedThisYear: boolean;
};

export function canRedeemFreeRenewal(
  input: RedemptionEligibilityInput,
): { ok: true } | { ok: false; reason: RedemptionRejectReason } {
  if (input.redeemedThisYear) {
    return { ok: false, reason: "YEARLY_CAP_REACHED" };
  }
  if (input.balance < input.costThb) {
    return { ok: false, reason: "INSUFFICIENT_POINTS" };
  }
  return { ok: true };
}
