import { describe, expect, it } from "vitest";
import {
  canRedeemFreeRenewal,
  evaluateReferralEligibility,
  normalizeEmail,
  pointsForPayment,
  referralUnlocksPoints,
} from "./rules";

describe("normalizeEmail", () => {
  it("lowercases and strips +tag aliases", () => {
    expect(normalizeEmail("Kontee+promo@Gmail.com")).toBe("kontee@gmail.com");
    expect(normalizeEmail("kontee@gmail.com")).toBe("kontee@gmail.com");
  });

  it("leaves addresses without a domain untouched aside from casing", () => {
    expect(normalizeEmail("NOT-AN-EMAIL")).toBe("not-an-email");
  });
});

describe("evaluateReferralEligibility", () => {
  const base = {
    affiliateUserId: "affiliate-1",
    referredUserId: "new-user-1",
    affiliateEmail: "affiliate@example.com",
    referredEmail: "friend@example.com",
    alreadyReferred: false,
  };

  it("allows a normal referral between two different people", () => {
    expect(evaluateReferralEligibility(base)).toEqual({ ok: true });
  });

  it("rejects a user applying their own referral code (same account id)", () => {
    const result = evaluateReferralEligibility({
      ...base,
      referredUserId: base.affiliateUserId,
    });
    expect(result).toEqual({ ok: false, reason: "SELF" });
  });

  it("rejects self-referral attempted via a +tag email alias", () => {
    const result = evaluateReferralEligibility({
      ...base,
      affiliateEmail: "kontee@gmail.com",
      referredEmail: "kontee+altaccount@gmail.com",
    });
    expect(result).toEqual({ ok: false, reason: "SELF_EMAIL_ALIAS" });
  });

  it("rejects a second referral discount for an account that already has one", () => {
    const result = evaluateReferralEligibility({ ...base, alreadyReferred: true });
    expect(result).toEqual({ ok: false, reason: "DUPLICATE" });
  });

  it("checks duplicate before self, since a repeat account is duplicate regardless", () => {
    const result = evaluateReferralEligibility({
      ...base,
      referredUserId: base.affiliateUserId,
      alreadyReferred: true,
    });
    expect(result).toEqual({ ok: false, reason: "DUPLICATE" });
  });
});

describe("pointsForPayment", () => {
  it("pegs affiliate points 1:1 to the baht discount given away", () => {
    expect(pointsForPayment(50)).toBe(50);
  });
});

describe("referralUnlocksPoints", () => {
  it("is true only while the referral has not yet been paid", () => {
    expect(referralUnlocksPoints({ paidAt: null })).toBe(true);
    expect(referralUnlocksPoints({ paidAt: new Date() })).toBe(false);
  });
});

describe("canRedeemFreeRenewal", () => {
  it("blocks redemption when the balance is below the renewal cost", () => {
    const result = canRedeemFreeRenewal({ balance: 100, costThb: 299, redeemedThisYear: false });
    expect(result).toEqual({ ok: false, reason: "INSUFFICIENT_POINTS" });
  });

  it("blocks a second redemption in the same calendar year even with enough points", () => {
    const result = canRedeemFreeRenewal({ balance: 1000, costThb: 299, redeemedThisYear: true });
    expect(result).toEqual({ ok: false, reason: "YEARLY_CAP_REACHED" });
  });

  it("allows redemption once balance covers the cost and the yearly cap is unused", () => {
    const result = canRedeemFreeRenewal({ balance: 299, costThb: 299, redeemedThisYear: false });
    expect(result).toEqual({ ok: true });
  });
});
