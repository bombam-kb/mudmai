-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('th', 'en');

-- CreateEnum
CREATE TYPE "PillarType" AS ENUM ('CAREER', 'PERSONAL', 'FINANCE', 'RELATIONSHIPS', 'MENTAL_HEALTH', 'PHYSICAL_HEALTH');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "VisionItemType" AS ENUM ('TEXT', 'IMAGE', 'DRAWING');

-- CreateEnum
CREATE TYPE "ReminderCadence" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('IN_APP', 'BROWSER');

-- CreateEnum
CREATE TYPE "NudgeTrigger" AS ENUM ('LOW_MENTAL_SCORE', 'LOW_CAREER_SCORE', 'TASK_SLUMP');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preferredLocale" "Locale" NOT NULL DEFAULT 'th',
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "pdpaConsentAt" TIMESTAMP(3),
    "pdpaConsentVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cadence" "ReminderCadence" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "hour" INTEGER NOT NULL DEFAULT 21,
    "minute" INTEGER NOT NULL DEFAULT 0,
    "weekday" INTEGER,
    "channel" "ReminderChannel" NOT NULL DEFAULT 'IN_APP',
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cadence" "ReminderCadence" NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastYearReflection" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "lastYearStory" TEXT NOT NULL,
    "happiestMoment" TEXT NOT NULL,
    "keyLearnings" TEXT NOT NULL,
    "healingThings" TEXT NOT NULL,
    "expectationsNextYear" TEXT NOT NULL,
    "ratingCareer" INTEGER NOT NULL,
    "ratingPersonal" INTEGER NOT NULL,
    "ratingFinance" INTEGER NOT NULL,
    "ratingRelationships" INTEGER NOT NULL,
    "ratingMental" INTEGER NOT NULL,
    "ratingPhysical" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PastYearReflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisionCanvas" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "canvasJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionCanvas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisionBoardItem" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "pillar" "PillarType" NOT NULL,
    "type" "VisionItemType" NOT NULL,
    "contentUrl" TEXT,
    "textContent" TEXT,
    "posX" DOUBLE PRECISION NOT NULL,
    "posY" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "zIndex" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionBoardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterlyGoal" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "pillar" "PillarType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "specificOutcome" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "deadline" DATE NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuarterlyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" UUID NOT NULL,
    "goalId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTodo" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "goalId" UUID,
    "pillar" "PillarType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyReview" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "whatILovedMost" TEXT NOT NULL,
    "whatToStop" TEXT NOT NULL,
    "whatToContinue" TEXT NOT NULL,
    "ratingCareer" INTEGER NOT NULL,
    "ratingPersonal" INTEGER NOT NULL,
    "ratingFinance" INTEGER NOT NULL,
    "ratingRelationships" INTEGER NOT NULL,
    "ratingMental" INTEGER NOT NULL,
    "ratingPhysical" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterlyReview" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "narrative" TEXT NOT NULL,
    "nextQuarterPlan" TEXT NOT NULL,
    "goalOutcomes" JSONB,
    "ratingCareer" INTEGER NOT NULL,
    "ratingPersonal" INTEGER NOT NULL,
    "ratingFinance" INTEGER NOT NULL,
    "ratingRelationships" INTEGER NOT NULL,
    "ratingMental" INTEGER NOT NULL,
    "ratingPhysical" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuarterlyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiNudgeLog" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "triggerReason" "NudgeTrigger" NOT NULL,
    "nudgeText" TEXT NOT NULL,
    "contextUsed" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiNudgeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderPreference_userId_cadence_key" ON "ReminderPreference"("userId", "cadence");

-- CreateIndex
CREATE INDEX "ReminderLog_userId_sentAt_idx" ON "ReminderLog"("userId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "PastYearReflection_userId_year_key" ON "PastYearReflection"("userId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "VisionCanvas_userId_year_key" ON "VisionCanvas"("userId", "year");

-- CreateIndex
CREATE INDEX "VisionBoardItem_userId_year_idx" ON "VisionBoardItem"("userId", "year");

-- CreateIndex
CREATE INDEX "QuarterlyGoal_userId_year_quarter_idx" ON "QuarterlyGoal"("userId", "year", "quarter");

-- CreateIndex
CREATE INDEX "Milestone_goalId_order_idx" ON "Milestone"("goalId", "order");

-- CreateIndex
CREATE INDEX "DailyTodo_userId_date_idx" ON "DailyTodo"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReview_userId_year_month_key" ON "MonthlyReview"("userId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "QuarterlyReview_userId_year_quarter_key" ON "QuarterlyReview"("userId", "year", "quarter");

-- CreateIndex
CREATE INDEX "AiNudgeLog_userId_createdAt_idx" ON "AiNudgeLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReminderPreference" ADD CONSTRAINT "ReminderPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastYearReflection" ADD CONSTRAINT "PastYearReflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionCanvas" ADD CONSTRAINT "VisionCanvas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionBoardItem" ADD CONSTRAINT "VisionBoardItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterlyGoal" ADD CONSTRAINT "QuarterlyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "QuarterlyGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTodo" ADD CONSTRAINT "DailyTodo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTodo" ADD CONSTRAINT "DailyTodo_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "QuarterlyGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReview" ADD CONSTRAINT "MonthlyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterlyReview" ADD CONSTRAINT "QuarterlyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiNudgeLog" ADD CONSTRAINT "AiNudgeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
