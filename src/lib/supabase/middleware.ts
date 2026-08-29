import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoAllowed } from "@/lib/env";

const PROTECTED = new Set([
  "home",
  "onboarding",
  "vision",
  "goals",
  "todos",
  "calendar",
  "reviews",
  "reminders",
  "settings",
]);

function localeAndPage(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0] === "en" || segments[0] === "th" ? segments[0] : "th";
  const rest = segments[0] === locale ? segments.slice(1) : segments;
  return { locale, page: rest[0] ?? "", rest };
}

export async function updateSession(
  request: NextRequest,
  response: NextResponse,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { locale, page, rest } = localeAndPage(request.nextUrl.pathname);
  const isProtected = PROTECTED.has(page) || (page === "privacy" && rest[1] === "consent");

  if (!url || !key) {
    if (!isDemoAllowed() && isProtected) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${locale}`;
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[],
      ) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = page === "login" || page === "signup";

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/login`;
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    const plan = request.nextUrl.searchParams.get("plan");
    if (plan === "founder" || plan === "yearly") {
      redirectUrl.pathname = `/${locale}/pricing`;
      redirectUrl.search = `?plan=${plan}`;
    } else {
      redirectUrl.pathname = `/${locale}/home`;
      redirectUrl.search = "";
    }
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
