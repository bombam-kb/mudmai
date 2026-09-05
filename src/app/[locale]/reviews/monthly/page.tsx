import { setRequestLocale } from "next-intl/server";
import { MonthlyReviewForm } from "@/components/reviews/monthly-form";
import { requireAppUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { findMonthPlan } from "@/lib/month-plan/db";
import { emptyMonthPlan, toMonthPlanDto } from "@/lib/month-plan/schema";
import { toMonthlyDto } from "@/lib/reviews/schema";
import { calendarParts } from "@/lib/year";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
};

export const dynamic = "force-dynamic";

export default async function MonthlyReviewPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const now = calendarParts();
  const year = Number(query.year) || now.year;
  const month = Math.min(12, Math.max(1, Number(query.month) || now.month));
  const session = await requireAppUser(locale);

  if (session.demoMode) {
    return (
      <MonthlyReviewForm
        name={session.name}
        demoMode
        year={year}
        month={month}
        initial={null}
        initialPlan={emptyMonthPlan(year, month)}
      />
    );
  }

  const [review, planRow] = await Promise.all([
    prisma.monthlyReview
      .findUnique({
        where: { userId_year_month: { userId: session.user.id, year, month } },
      })
      .catch(() => null),
    findMonthPlan(session.user.id, year, month).catch(() => null),
  ]);

  return (
    <MonthlyReviewForm
      name={session.name}
      demoMode={false}
      year={year}
      month={month}
      initial={review ? toMonthlyDto(review) : null}
      initialPlan={planRow ? toMonthPlanDto(planRow) : emptyMonthPlan(year, month)}
    />
  );
}
