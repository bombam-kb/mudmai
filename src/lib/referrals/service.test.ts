import { describe, expect, it } from "vitest";
import { applyReferral, markCheckoutPaid, redeemPointsForFreeRenewal } from "./service";
import type { ReferralDb } from "./service";

type FakeUser = { id: string; email: string; referralCode: string | null };
type FakeCheckout = {
  id: string;
  userId: string;
  plan: "FOUNDER" | "YEARLY";
  listPriceThb: number | null;
  discountThb: number;
  amountThb: number;
  paidViaPoints: boolean;
  status: "PENDING" | "PAID";
};
type FakeReferral = {
  id: string;
  affiliateUserId: string;
  referredUserId: string;
  codeUsed: string;
  discountThb: number;
  checkoutId: string | null;
  paidAt: Date | null;
  pointsAwarded: number;
  createdAt: Date;
};
type FakeLedgerRow = {
  id: string;
  userId: string;
  delta: number;
  reason: string;
  referralId: string | null;
  checkoutId: string | null;
  balanceAfter: number;
  periodYear: number;
  createdAt: Date;
};

/** Minimal in-memory stand-in for the handful of Prisma calls service.ts makes — keeps these
 * as true unit tests (no live Postgres) while still exercising the real transaction flow. */
class FakeDb {
  users: FakeUser[] = [];
  checkouts: FakeCheckout[] = [];
  referrals: FakeReferral[] = [];
  ledger: FakeLedgerRow[] = [];
  eventLog: unknown[] = [];
  private seq = 0;

  private nextId(prefix: string) {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }

  user = {
    findUnique: async ({ where }: { where: { referralCode?: string } }) => {
      if (where.referralCode) {
        return this.users.find((u) => u.referralCode === where.referralCode) ?? null;
      }
      return null;
    },
  };

  referral = {
    findUnique: async ({
      where,
    }: {
      where: { referredUserId?: string; checkoutId?: string };
    }) => {
      if (where.referredUserId) {
        return this.referrals.find((r) => r.referredUserId === where.referredUserId) ?? null;
      }
      if (where.checkoutId) {
        return this.referrals.find((r) => r.checkoutId === where.checkoutId) ?? null;
      }
      return null;
    },
    create: async ({ data }: { data: Omit<FakeReferral, "id" | "checkoutId" | "paidAt" | "pointsAwarded" | "createdAt"> }) => {
      const row: FakeReferral = {
        id: this.nextId("referral"),
        checkoutId: null,
        paidAt: null,
        pointsAwarded: 0,
        createdAt: new Date(),
        ...data,
      };
      this.referrals.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<FakeReferral> }) => {
      const row = this.referrals.find((r) => r.id === where.id);
      if (!row) throw new Error("not found");
      Object.assign(row, data);
      return row;
    },
    findMany: async () => this.referrals,
  };

  pointsLedger = {
    findFirst: async ({
      where,
    }: {
      where: { userId: string; reason?: string; periodYear?: number };
    }) => {
      const rows = this.ledger
        .filter(
          (row) =>
            row.userId === where.userId &&
            (where.reason === undefined || row.reason === where.reason) &&
            (where.periodYear === undefined || row.periodYear === where.periodYear),
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return rows[0] ?? null;
    },
    create: async ({ data }: { data: Omit<FakeLedgerRow, "id" | "createdAt"> }) => {
      const row: FakeLedgerRow = { id: this.nextId("ledger"), createdAt: new Date(), ...data };
      this.ledger.push(row);
      return row;
    },
  };

  referralEventLog = {
    create: async ({ data }: { data: unknown }) => {
      this.eventLog.push(data);
      return data;
    },
    createMany: async ({ data }: { data: unknown[] }) => {
      this.eventLog.push(...data);
      return { count: data.length };
    },
  };

  billingCheckout = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.checkouts.find((c) => c.id === where.id) ?? null,
    create: async ({ data }: { data: Omit<FakeCheckout, "id"> }) => {
      const row: FakeCheckout = { id: this.nextId("checkout"), ...data };
      this.checkouts.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<FakeCheckout> }) => {
      const row = this.checkouts.find((c) => c.id === where.id);
      if (!row) throw new Error("not found");
      Object.assign(row, data);
      return row;
    },
  };

  async $transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> {
    return fn(this);
  }

  asDb(): ReferralDb {
    return this as unknown as ReferralDb;
  }
}

describe("applyReferral", () => {
  it("grants the discount for a legitimate referral", async () => {
    const db = new FakeDb();
    db.users.push({ id: "affiliate-1", email: "affiliate@example.com", referralCode: "ABCD1234" });

    const result = await applyReferral(
      { code: "ABCD1234", referredUserId: "new-user-1", referredEmail: "friend@example.com" },
      db.asDb(),
    );

    expect(result.ok).toBe(true);
    expect(db.referrals).toHaveLength(1);
    expect(db.referrals[0]).toMatchObject({
      affiliateUserId: "affiliate-1",
      referredUserId: "new-user-1",
      discountThb: 50,
    });
  });

  it("rejects and logs a self-referral instead of creating a Referral row", async () => {
    const db = new FakeDb();
    db.users.push({ id: "user-1", email: "user@example.com", referralCode: "SELFCODE" });

    const result = await applyReferral(
      { code: "SELFCODE", referredUserId: "user-1", referredEmail: "user@example.com" },
      db.asDb(),
    );

    expect(result).toEqual({ ok: false, reason: "SELF" });
    expect(db.referrals).toHaveLength(0);
    expect(db.eventLog).toHaveLength(1);
    expect(db.eventLog[0]).toMatchObject({ type: "REJECTED_SELF" });
  });

  it("rejects applying a discount twice to the same new account", async () => {
    const db = new FakeDb();
    db.users.push({ id: "affiliate-1", email: "affiliate@example.com", referralCode: "ABCD1234" });
    db.users.push({ id: "affiliate-2", email: "other@example.com", referralCode: "WXYZ9999" });
    await applyReferral(
      { code: "ABCD1234", referredUserId: "new-user-1", referredEmail: "friend@example.com" },
      db.asDb(),
    );

    const second = await applyReferral(
      { code: "WXYZ9999", referredUserId: "new-user-1", referredEmail: "friend@example.com" },
      db.asDb(),
    );

    expect(second).toEqual({ ok: false, reason: "DUPLICATE" });
    expect(db.referrals).toHaveLength(1);
  });
});

describe("markCheckoutPaid", () => {
  it("does not award affiliate points while the checkout is still PENDING", async () => {
    const db = new FakeDb();
    db.checkouts.push({
      id: "checkout-1",
      userId: "new-user-1",
      plan: "YEARLY",
      listPriceThb: 299,
      discountThb: 50,
      amountThb: 249,
      paidViaPoints: false,
      status: "PENDING",
    });
    db.referrals.push({
      id: "referral-1",
      affiliateUserId: "affiliate-1",
      referredUserId: "new-user-1",
      codeUsed: "ABCD1234",
      discountThb: 50,
      checkoutId: "checkout-1",
      paidAt: null,
      pointsAwarded: 0,
      createdAt: new Date(),
    });

    expect(db.ledger).toHaveLength(0);

    const result = await markCheckoutPaid("checkout-1", db.asDb());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pointsAwarded).toBe(50);
    expect(db.ledger).toHaveLength(1);
    expect(db.ledger[0]).toMatchObject({ userId: "affiliate-1", delta: 50, reason: "POINTS_EARNED" });
    expect(db.referrals[0].paidAt).not.toBeNull();
  });

  it("is idempotent — re-confirming an already-PAID checkout awards no extra points", async () => {
    const db = new FakeDb();
    db.checkouts.push({
      id: "checkout-1",
      userId: "new-user-1",
      plan: "YEARLY",
      listPriceThb: 299,
      discountThb: 50,
      amountThb: 249,
      paidViaPoints: false,
      status: "PENDING",
    });
    db.referrals.push({
      id: "referral-1",
      affiliateUserId: "affiliate-1",
      referredUserId: "new-user-1",
      codeUsed: "ABCD1234",
      discountThb: 50,
      checkoutId: "checkout-1",
      paidAt: null,
      pointsAwarded: 0,
      createdAt: new Date(),
    });

    await markCheckoutPaid("checkout-1", db.asDb());
    const second = await markCheckoutPaid("checkout-1", db.asDb());

    expect(second).toMatchObject({ ok: true, pointsAwarded: 0, alreadyPaid: true });
    expect(db.ledger).toHaveLength(1);
  });

  it("awards nothing when the checkout has no linked referral", async () => {
    const db = new FakeDb();
    db.checkouts.push({
      id: "checkout-1",
      userId: "new-user-1",
      plan: "YEARLY",
      listPriceThb: 299,
      discountThb: 0,
      amountThb: 299,
      paidViaPoints: false,
      status: "PENDING",
    });

    const result = await markCheckoutPaid("checkout-1", db.asDb());

    expect(result).toMatchObject({ ok: true, pointsAwarded: 0 });
    expect(db.ledger).toHaveLength(0);
  });
});

describe("redeemPointsForFreeRenewal", () => {
  function seedBalance(db: FakeDb, userId: string, balance: number, year: number) {
    db.ledger.push({
      id: "seed",
      userId,
      delta: balance,
      reason: "POINTS_EARNED",
      referralId: null,
      checkoutId: null,
      balanceAfter: balance,
      periodYear: year,
      createdAt: new Date(),
    });
  }

  it("blocks redemption when the balance is below the yearly plan price", async () => {
    const db = new FakeDb();
    const year = new Date().getFullYear();
    seedBalance(db, "affiliate-1", 100, year);

    const result = await redeemPointsForFreeRenewal("affiliate-1", db.asDb());

    expect(result).toMatchObject({ ok: false, reason: "INSUFFICIENT_POINTS" });
    expect(db.checkouts).toHaveLength(0);
  });

  it("blocks a second free renewal in the same calendar year", async () => {
    const db = new FakeDb();
    const year = new Date().getFullYear();
    seedBalance(db, "affiliate-1", 1000, year);

    const first = await redeemPointsForFreeRenewal("affiliate-1", db.asDb());
    expect(first.ok).toBe(true);

    const second = await redeemPointsForFreeRenewal("affiliate-1", db.asDb());
    expect(second).toMatchObject({ ok: false, reason: "YEARLY_CAP_REACHED" });
    expect(db.checkouts).toHaveLength(1);
  });

  it("creates a zero-cost PAID checkout once redeemed", async () => {
    const db = new FakeDb();
    const year = new Date().getFullYear();
    seedBalance(db, "affiliate-1", 299, year);

    const result = await redeemPointsForFreeRenewal("affiliate-1", db.asDb());

    expect(result.ok).toBe(true);
    expect(db.checkouts[0]).toMatchObject({
      plan: "YEARLY",
      amountThb: 0,
      paidViaPoints: true,
      status: "PAID",
    });
  });
});
