import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { AdminBoard } from "@/components/admin/admin-board";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="jr-page-wash min-h-dvh">
      <AdminBoard />
    </div>
  );
}
