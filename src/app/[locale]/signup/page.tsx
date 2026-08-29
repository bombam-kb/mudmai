import { setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";
import { isLineLoginConfigured } from "@/lib/env";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string; ref?: string; error?: string }>;
};

export default async function SignupPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { plan, ref, error } = await searchParams;
  setRequestLocale(locale);
  return (
    <AuthForm
      mode="signup"
      plan={plan}
      referralCode={ref}
      lineLoginEnabled={isLineLoginConfigured()}
      errorCode={error}
    />
  );
}
