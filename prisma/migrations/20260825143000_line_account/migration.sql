ALTER TYPE "ReminderChannel" ADD VALUE 'LINE';

CREATE TABLE "LineAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lineUserId" TEXT NOT NULL,
    "reachable" BOOLEAN NOT NULL DEFAULT false,
    "reminderOptIn" BOOLEAN NOT NULL DEFAULT true,
    "broadcastOptIn" BOOLEAN NOT NULL DEFAULT false,
    "friendAt" TIMESTAMP(3),
    "unfollowedAt" TIMESTAMP(3),
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LineAccount_userId_key" ON "LineAccount"("userId");
CREATE UNIQUE INDEX "LineAccount_lineUserId_key" ON "LineAccount"("lineUserId");
CREATE INDEX "LineAccount_reachable_reminderOptIn_idx" ON "LineAccount"("reachable", "reminderOptIn");

ALTER TABLE "LineAccount" ADD CONSTRAINT "LineAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LineWebhookEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineWebhookEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LineAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LineAccount" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LineAccount" FROM anon, authenticated;
DROP POLICY IF EXISTS deny_postgrest ON "LineAccount";
CREATE POLICY deny_postgrest ON "LineAccount" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS owner_all ON "LineAccount";
CREATE POLICY owner_all ON "LineAccount" FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE "LineWebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LineWebhookEvent" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LineWebhookEvent" FROM anon, authenticated;
DROP POLICY IF EXISTS deny_postgrest ON "LineWebhookEvent";
CREATE POLICY deny_postgrest ON "LineWebhookEvent" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS owner_all ON "LineWebhookEvent";
CREATE POLICY owner_all ON "LineWebhookEvent" FOR ALL TO postgres USING (true) WITH CHECK (true);
