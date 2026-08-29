import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { prisma } from "@/lib/prisma";
import {
  parseOnboardingPayload,
  reflectionToDraft,
} from "@/lib/onboarding/schema";
import { activeCalendarYear } from "@/lib/year";
import { rateLimitJson } from "@/lib/http/rate-limit";

export async function GET() {
  const auth = await requireApiUser({ allowIncompleteOnboarding: true });
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const year = activeCalendarYear();
  const reflection = await prisma.pastYearReflection
    .findUnique({
      where: { userId_year: { userId: user.id, year } },
    })
    .catch(() => null);

  return NextResponse.json({
    ok: true,
    year,
    draft: reflection ? reflectionToDraft(reflection) : null,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser({ allowIncompleteOnboarding: true });
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`onboarding:${user.id}`, 20);
  if (limited) return limited;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, reason: "database" },
      { status: 503 },
    );
  }

  const parsed = parseOnboardingPayload(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, errors: parsed.errors },
      { status: 400 },
    );
  }

  const locale = user.user_metadata?.preferredLocale === "en" ? "en" : "th";
  await ensureProfile(user, locale);

  const year = activeCalendarYear();
  const { data } = parsed;

  const reflection = await prisma.pastYearReflection.upsert({
    where: { userId_year: { userId: user.id, year } },
    create: {
      userId: user.id,
      year,
      lastYearStory: data.lastYearStory,
      happiestMoment: data.happiestMoment,
      keyLearnings: data.keyLearnings,
      healingThings: data.healingThings,
      expectationsNextYear: data.expectationsNextYear,
      ratingCareer: data.ratings.CAREER,
      ratingPersonal: data.ratings.PERSONAL,
      ratingFinance: data.ratings.FINANCE,
      ratingRelationships: data.ratings.RELATIONSHIPS,
      ratingMental: data.ratings.MENTAL_HEALTH,
      ratingPhysical: data.ratings.PHYSICAL_HEALTH,
    },
    update: {
      lastYearStory: data.lastYearStory,
      happiestMoment: data.happiestMoment,
      keyLearnings: data.keyLearnings,
      healingThings: data.healingThings,
      expectationsNextYear: data.expectationsNextYear,
      ratingCareer: data.ratings.CAREER,
      ratingPersonal: data.ratings.PERSONAL,
      ratingFinance: data.ratings.FINANCE,
      ratingRelationships: data.ratings.RELATIONSHIPS,
      ratingMental: data.ratings.MENTAL_HEALTH,
      ratingPhysical: data.ratings.PHYSICAL_HEALTH,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingComplete: true },
  });

  return NextResponse.json({ ok: true, reflection });
}
