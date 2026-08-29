import { setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";
import { isLineLoginConfigured } from "@/lib/env";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string; error?: string }>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { plan, error } = await searchParams;
  setRequestLocale(locale);
  return (
    <AuthForm
      mode="login"
      plan={plan}
      lineLoginEnabled={isLineLoginConfigured()}
      errorCode={error}
    />
  );
}
