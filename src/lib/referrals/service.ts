import { prisma } from "@/lib/prisma";
import { PLAN, redemptionCostPoints } from "@/lib/billing/plan";
import { activeCalendarYear } from "@/lib/year";
import {
  canRedeemFreeRenewal,
  evaluateReferralEligibility,
  pointsForPayment,
  referralUnlocksPoints,
  type ReferralRejectReason,
  type RedemptionRejectReason,
} from "@/lib/referrals/rules";

/** Narrowed to the calls this module makes, so tests can inject an in-memory fake instead of a live DB. */
export type ReferralDb = typeof prisma;

export async function applyReferral(
  input: { code: string; referredUserId: string; referredEmail: string },
  db: ReferralDb = prisma,
) {
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false as const, reason: "CODE_NOT_FOUND" as const };

  const affiliate = await db.user.findUnique({
    where: { referralCode: code },
    select: { id: true, email: true },
  });
  if (!affiliate) {
    return { ok: false as const, reason: "CODE_NOT_FOUND" as const };
  }

  const existing = await db.referral.findUnique({
    where: { referredUserId: input.referredUserId },
  });

  const evaluation = evaluateReferralEligibility({
    affiliateUserId: affiliate.id,
    referredUserId: input.referredUserId,
    affiliateEmail: affiliate.email,
    referredEmail: input.referredEmail,
    alreadyReferred: Boolean(existing),
  });

  if (!evaluation.ok) {
    await db.referralEventLog.create({
      data: {
        type: evaluation.reason === "DUPLICATE" ? "REJECTED_DUPLICATE" : "REJECTED_SELF",
        userId: input.referredUserId,
        affiliateUserId: affiliate.id,
        metadata: { reason: evaluation.reason, code },
      },
    });
    return { ok: false as const, reason: evaluation.reason };
  }

  const referral = await db.referral.create({
    data: {
      affiliateUserId: affiliate.id,
      referredUserId: input.referredUserId,
      codeUsed: code,
      discountThb: PLAN.referralCreditThb,
    },
  });

  await db.referralEventLog.create({
    data: {
      type: "DISCOUNT_APPLIED",
      userId: input.referredUserId,
      affiliateUserId: affiliate.id,
      referralId: referral.id,
      metadata: { discountThb: referral.discountThb },
    },
  });

  return { ok: true as const, referral };
}

export async function getPointsBalance(userId: string, db: ReferralDb = prisma) {
  const last = await db.pointsLedger.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return last?.balanceAfter ?? 0;
}

/**
 * Flips a checkout to PAID and, only then, credits the referring affiliate.
 * Idempotent: calling this again on an already-PAID checkout is a no-op (no double points).
 */
export async function markCheckoutPaid(checkoutId: string, db: ReferralDb = prisma) {
  return db.$transaction(async (tx) => {
    const checkout = await tx.billingCheckout.findUnique({ where: { id: checkoutId } });
    if (!checkout) {
      return { ok: false as const, reason: "NOT_FOUND" as const };
    }
    if (checkout.status === "PAID") {
      return { ok: true as const, checkout, pointsAwarded: 0, alreadyPaid: true };
    }

    const paidCheckout = await tx.billingCheckout.update({
      where: { id: checkoutId },
      data: { status: "PAID" },
    });

    const referral = await tx.referral.findUnique({ where: { checkoutId } });
    let pointsAwarded = 0;

    if (referral && referralUnlocksPoints(referral)) {
      const lastLedger = await tx.pointsLedger.findFirst({
        where: { userId: referral.affiliateUserId },
        orderBy: { createdAt: "desc" },
      });
      const balanceBefore = lastLedger?.balanceAfter ?? 0;
      pointsAwarded = pointsForPayment(referral.discountThb);
      const now = new Date();

      await tx.referral.update({
        where: { id: referral.id },
        data: { paidAt: now, pointsAwarded },
      });
      await tx.pointsLedger.create({
        data: {
          userId: referral.affiliateUserId,
          delta: pointsAwarded,
          reason: "POINTS_EARNED",
          referralId: referral.id,
          checkoutId,
          balanceAfter: balanceBefore + pointsAwarded,
          periodYear: activeCalendarYear(now),
        },
      });
      await tx.referralEventLog.createMany({
        data: [
          {
            type: "REFERRAL_PAID",
            userId: referral.referredUserId,
            affiliateUserId: referral.affiliateUserId,
            referralId: referral.id,
          },
          {
            type: "POINTS_EARNED",
            affiliateUserId: referral.affiliateUserId,
            referralId: referral.id,
            metadata: { pointsAwarded },
          },
        ],
      });
    }

    return { ok: true as const, checkout: paidCheckout, pointsAwarded, alreadyPaid: false };
  });
}

export async function redeemPointsForFreeRenewal(userId: string, db: ReferralDb = prisma) {
  return db.$transaction(async (tx) => {
    const year = activeCalendarYear();
    const [lastLedger, redeemedThisYear] = await Promise.all([
      tx.pointsLedger.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
      tx.pointsLedger.findFirst({
        where: { userId, reason: "POINTS_REDEEMED", periodYear: year },
      }),
    ]);
    const balance = lastLedger?.balanceAfter ?? 0;
    const costThb = redemptionCostPoints();

    const evaluation = canRedeemFreeRenewal({
      balance,
      costThb,
      redeemedThisYear: Boolean(redeemedThisYear),
    });
    if (!evaluation.ok) {
      return { ok: false as const, reason: evaluation.reason, balance, costThb };
    }

    const checkout = await tx.billingCheckout.create({
      data: {
        userId,
        plan: "YEARLY",
        listPriceThb: PLAN.yearlyThb,
        discountThb: 0,
        amountThb: 0,
        paidViaPoints: true,
        status: "PAID",
      },
    });
    await tx.pointsLedger.create({
      data: {
        userId,
        delta: -costThb,
        reason: "POINTS_REDEEMED",
        checkoutId: checkout.id,
        balanceAfter: balance - costThb,
        periodYear: year,
      },
    });
    await tx.referralEventLog.create({
      data: { type: "POINTS_REDEEMED", userId, metadata: { costThb, checkoutId: checkout.id } },
    });

    return { ok: true as const, checkout, balance: balance - costThb };
  });
}

export async function getReferralSummary(userId: string, db: ReferralDb = prisma) {
  const year = activeCalendarYear();
  const [balance, referrals, redeemedThisYear] = await Promise.all([
    getPointsBalance(userId, db),
    db.referral.findMany({
      where: { affiliateUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.pointsLedger.findFirst({
      where: { userId, reason: "POINTS_REDEEMED", periodYear: year },
    }),
  ]);
  const costThb = redemptionCostPoints();

  return {
    balance,
    costThb,
    canRedeem: canRedeemFreeRenewal({
      balance,
      costThb,
      redeemedThisYear: Boolean(redeemedThisYear),
    }).ok,
    history: referrals.map((referral) => ({
      createdAt: referral.createdAt,
      paid: referral.paidAt !== null,
      pointsAwarded: referral.pointsAwarded,
    })),
  };
}

export type { ReferralRejectReason, RedemptionRejectReason };
