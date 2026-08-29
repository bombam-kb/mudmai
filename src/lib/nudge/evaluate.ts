import { prisma } from "@/lib/prisma";
import { generateNudgeTextSync, upgradeNudgeText } from "@/lib/nudge/generate";
import {
  detectPendingNudges,
  toNudgeDto,
  type NudgeDto,
  type NudgeReflection,
} from "@/lib/nudge/schema";
import { ratingsFromDb } from "@/lib/reviews/schema";
import type { OnboardingRatings } from "@/lib/onboarding/schema";

export async function evaluateNudgesForUser(input: {
  userId: string;
  locale: "th" | "en";
  reflection: NudgeReflection | null;
  monthly: { year: number; month: number; ratings: OnboardingRatings } | null;
  weekTodos: { isCompleted: boolean }[];
  weekFrom: string;
  weekTo: string;
}): Promise<NudgeDto[]> {
  const existing = await prisma.aiNudgeLog
    .findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    })
    .catch(() => [] as Awaited<ReturnType<typeof prisma.aiNudgeLog.findMany>>);

  const pending = detectPendingNudges({
    reflection: input.reflection,
    monthly: input.monthly,
    weekTodos: input.weekTodos,
    weekFrom: input.weekFrom,
    weekTo: input.weekTo,
    existing,
  });

  for (const item of pending) {
    const created = await prisma.aiNudgeLog.create({
      data: {
        userId: input.userId,
        triggerReason: item.triggerReason,
        nudgeText: generateNudgeTextSync(
          item.triggerReason,
          input.locale,
          item.generateContext,
        ),
        contextUsed: item.contextUsed,
      },
    });
    existing.unshift(created);
    void upgradeNudgeText(
      created.id,
      input.userId,
      item.triggerReason,
      input.locale,
      item.generateContext,
    );
  }

  return existing.filter((row) => !row.isRead).slice(0, 5).map(toNudgeDto);
}

export function monthlyToNudgeInput(review: {
  year: number;
  month: number;
  ratingCareer: number;
  ratingPersonal: number;
  ratingFinance: number;
  ratingRelationships: number;
  ratingMental: number;
  ratingPhysical: number;
}) {
  return {
    year: review.year,
    month: review.month,
    ratings: ratingsFromDb(review),
  };
}
