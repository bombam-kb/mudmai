import { setRequestLocale } from "next-intl/server";
import { ReviewsHub } from "@/components/reviews/reviews-hub";
import { requireAppUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/prisma";
import { ratingsFromDb, toMonthlyDto, toQuarterlyDto } from "@/lib/reviews/schema";
import { calendarParts } from "@/lib/year";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function ReviewsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { year } = calendarParts();
  const session = await requireAppUser(locale);

  if (session.demoMode) {
    return (
      <ReviewsHub
        name={session.name}
        demoMode
        year={year}
        monthly={[]}
        quarterly={[]}
      />
    );
  }

  const [monthly, quarterly] = await Promise.all([
    prisma.monthlyReview
      .findMany({
        where: { userId: session.user.id, year },
        orderBy: { month: "asc" },
      })
      .catch(() => []),
    prisma.quarterlyReview
      .findMany({
        where: { userId: session.user.id, year },
        orderBy: { quarter: "asc" },
      })
      .catch(() => []),
  ]);

  return (
    <ReviewsHub
      name={session.name}
      demoMode={false}
      year={year}
      monthly={monthly.map(toMonthlyDto)}
      quarterly={quarterly.map(toQuarterlyDto)}
      baseline={session.reflection ? ratingsFromDb(session.reflection) : null}
    />
  );
}
