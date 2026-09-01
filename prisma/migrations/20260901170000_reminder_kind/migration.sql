-- AlterTable
ALTER TABLE "ReminderLog" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'DAILY';

-- CreateIndex
CREATE INDEX "ReminderLog_userId_kind_sentAt_idx" ON "ReminderLog"("userId", "kind", "sentAt");
