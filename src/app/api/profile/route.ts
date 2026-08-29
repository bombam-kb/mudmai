import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { prisma } from "@/lib/prisma";
import { PDPA_VERSION } from "@/lib/pdpa";
import { rateLimitJson } from "@/lib/http/rate-limit";
import type { Locale } from "@prisma/client";

export async function POST(request: Request) {
  const auth = await requireApiUser({
    allowMissingPdpa: true,
    allowIncompleteOnboarding: true,
  });
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const limited = await rateLimitJson(`profile:${user.id}`, 30);
  if (limited) return limited;

  const body = (await request.json().catch(() => ({}))) as {
    locale?: Locale;
    pdpaConsent?: boolean;
    pdpaVersion?: string;
  };

  let profile;
  try {
    profile = await ensureProfile(user, body.locale === "en" ? "en" : "th");
  } catch (error) {
    console.error("ensureProfile", error);
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }

  if (body.pdpaConsent === true) {
    if (!profile) {
      return NextResponse.json({ ok: false, error: "profile" }, { status: 503 });
    }
    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          pdpaConsentAt: new Date(),
          pdpaConsentVersion: PDPA_VERSION,
        },
      });
      return NextResponse.json({
        ok: true,
        saved: true,
        profile: updated,
      });
    } catch (error) {
      console.error("pdpa consent save", error);
      return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
    }
  }

  return NextResponse.json({ ok: true, saved: false, profile });
}
