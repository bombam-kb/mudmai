import { setRequestLocale } from "next-intl/server";
import { ReflexRecapLoader } from "@/components/reviews/reflex-loader";
import { requireAppUser } from "@/lib/auth/require-user";
import { calendarParts } from "@/lib/year";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
};

export const dynamic = "force-dynamic";

export default async function ReflexPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const now = calendarParts();
  const year = Number(query.year) || now.year;
  const month = Math.min(12, Math.max(1, Number(query.month) || now.month));
  const session = await requireAppUser(locale);

  return (
    <ReflexRecapLoader
      year={year}
      month={month}
      demoMode={session.demoMode}
    />
  );
}
