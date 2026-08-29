import { setRequestLocale } from "next-intl/server";
import { QuarterlyReviewForm } from "@/components/reviews/quarterly-form";
import { requireAppUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { toGoalDto } from "@/lib/goals/schema";
import { toQuarterlyDto } from "@/lib/reviews/schema";
import { calendarParts } from "@/lib/year";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string; quarter?: string }>;
};

export const dynamic = "force-dynamic";

export default async function QuarterlyReviewPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const now = calendarParts();
  const year = Number(query.year) || now.year;
  const quarter = Math.min(4, Math.max(1, Number(query.quarter) || now.quarter));
  const session = await requireAppUser(locale);

  if (session.demoMode) {
    return (
      <QuarterlyReviewForm
        name={session.name}
        demoMode
        year={year}
        quarter={quarter}
        initial={null}
        goals={[]}
      />
    );
  }

  const [review, goals] = await Promise.all([
    prisma.quarterlyReview
      .findUnique({
        where: { userId_year_quarter: { userId: session.user.id, year, quarter } },
      })
      .catch(() => null),
    prisma.quarterlyGoal
      .findMany({
        where: { userId: session.user.id, year, quarter },
        include: { milestones: { orderBy: { order: "asc" } } },
        orderBy: { createdAt: "asc" },
      })
      .catch(() => []),
  ]);

  return (
    <QuarterlyReviewForm
      name={session.name}
      demoMode={false}
      year={year}
      quarter={quarter}
      initial={review ? toQuarterlyDto(review) : null}
      goals={goals.map(toGoalDto)}
    />
  );
}
