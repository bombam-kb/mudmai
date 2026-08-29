-- Catch-up: referral fields were in Prisma schema but never migrated.
-- Without User.referralCode, every prisma.user.findUnique fails and PDPA consent cannot save.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");

ALTER TABLE "BillingCheckout" ADD COLUMN IF NOT EXISTS "listPriceThb" INTEGER;
ALTER TABLE "BillingCheckout" ADD COLUMN IF NOT EXISTS "discountThb" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BillingCheckout" ADD COLUMN IF NOT EXISTS "paidViaPoints" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  CREATE TYPE "ReferralEventType" AS ENUM (
    'DISCOUNT_APPLIED',
    'REFERRAL_PAID',
    'POINTS_EARNED',
    'POINTS_REDEEMED',
    'REJECTED_SELF',
    'REJECTED_DUPLICATE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Referral" (
    "id" UUID NOT NULL,
    "affiliateUserId" UUID NOT NULL,
    "referredUserId" UUID NOT NULL,
    "codeUsed" TEXT NOT NULL,
    "discountThb" INTEGER NOT NULL,
    "checkoutId" UUID,
    "paidAt" TIMESTAMP(3),
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Referral_referredUserId_key" ON "Referral"("referredUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "Referral_checkoutId_key" ON "Referral"("checkoutId");
CREATE INDEX IF NOT EXISTS "Referral_affiliateUserId_idx" ON "Referral"("affiliateUserId");

DO $$ BEGIN
  ALTER TABLE "Referral" ADD CONSTRAINT "Referral_affiliateUserId_fkey"
    FOREIGN KEY ("affiliateUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey"
    FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Referral" ADD CONSTRAINT "Referral_checkoutId_fkey"
    FOREIGN KEY ("checkoutId") REFERENCES "BillingCheckout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PointsLedger" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "ReferralEventType" NOT NULL,
    "referralId" UUID,
    "checkoutId" UUID,
    "balanceAfter" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PointsLedger_userId_createdAt_idx" ON "PointsLedger"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "PointsLedger_userId_reason_periodYear_idx" ON "PointsLedger"("userId", "reason", "periodYear");

DO $$ BEGIN
  ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_referralId_fkey"
    FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ReferralEventLog" (
    "id" UUID NOT NULL,
    "type" "ReferralEventType" NOT NULL,
    "userId" UUID,
    "affiliateUserId" UUID,
    "referralId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralEventLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReferralEventLog_userId_createdAt_idx" ON "ReferralEventLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReferralEventLog_affiliateUserId_createdAt_idx" ON "ReferralEventLog"("affiliateUserId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "ReferralEventLog" ADD CONSTRAINT "ReferralEventLog_referralId_fkey"
    FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Referral" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Referral" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Referral" FROM anon, authenticated;
DROP POLICY IF EXISTS deny_postgrest ON "Referral";
CREATE POLICY deny_postgrest ON "Referral" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS owner_all ON "Referral";
CREATE POLICY owner_all ON "Referral" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "PointsLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PointsLedger" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PointsLedger" FROM anon, authenticated;
DROP POLICY IF EXISTS deny_postgrest ON "PointsLedger";
CREATE POLICY deny_postgrest ON "PointsLedger" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS owner_all ON "PointsLedger";
CREATE POLICY owner_all ON "PointsLedger" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "ReferralEventLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReferralEventLog" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ReferralEventLog" FROM anon, authenticated;
DROP POLICY IF EXISTS deny_postgrest ON "ReferralEventLog";
CREATE POLICY deny_postgrest ON "ReferralEventLog" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS owner_all ON "ReferralEventLog";
CREATE POLICY owner_all ON "ReferralEventLog" FOR ALL TO postgres USING (true) WITH CHECK (true);
