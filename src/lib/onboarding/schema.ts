import { PILLARS, type PillarId } from "@/lib/pillars";

export const TEXT_FIELDS = [
  "lastYearStory",
  "happiestMoment",
  "keyLearnings",
  "healingThings",
  "expectationsNextYear",
] as const;

export type OnboardingTextField = (typeof TEXT_FIELDS)[number];

export type OnboardingRatings = Record<PillarId, number>;

export type OnboardingDraft = {
  lastYearStory: string;
  happiestMoment: string;
  keyLearnings: string;
  healingThings: string;
  expectationsNextYear: string;
  ratings: OnboardingRatings;
};

export const EMPTY_RATINGS: OnboardingRatings = {
  CAREER: 0,
  PERSONAL: 0,
  FINANCE: 0,
  RELATIONSHIPS: 0,
  MENTAL_HEALTH: 0,
  PHYSICAL_HEALTH: 0,
};

/** Neutral default when the user skips pillar sliders in reviews. */
export const DEFAULT_RATINGS: OnboardingRatings = {
  CAREER: 3,
  PERSONAL: 3,
  FINANCE: 3,
  RELATIONSHIPS: 3,
  MENTAL_HEALTH: 3,
  PHYSICAL_HEALTH: 3,
};

export function withDefaultRatings(ratings: OnboardingRatings): OnboardingRatings {
  const next = { ...DEFAULT_RATINGS };
  for (const pillar of PILLARS) {
    const value = ratings[pillar.id];
    if (Number.isInteger(value) && value >= 1 && value <= 5) {
      next[pillar.id] = value;
    }
  }
  return next;
}

export const EMPTY_DRAFT: OnboardingDraft = {
  lastYearStory: "",
  happiestMoment: "",
  keyLearnings: "",
  healingThings: "",
  expectationsNextYear: "",
  ratings: { ...EMPTY_RATINGS },
};

export type OnboardingFieldError = Partial<
  Record<OnboardingTextField | PillarId | "form", string>
>;

export function parseOnboardingPayload(input: unknown): {
  ok: true;
  data: OnboardingDraft;
} | {
  ok: false;
  errors: OnboardingFieldError;
} {
  const errors: OnboardingFieldError = {};
  const body = (input ?? {}) as Record<string, unknown>;
  const data: OnboardingDraft = {
    ...EMPTY_DRAFT,
    ratings: { ...EMPTY_RATINGS },
  };

  for (const field of TEXT_FIELDS) {
    const value = typeof body[field] === "string" ? body[field].trim() : "";
    if (!value) {
      errors[field] = "required";
    } else {
      data[field] = value;
    }
  }

  const rawRatings = (body.ratings ?? {}) as Record<string, unknown>;
  for (const pillar of PILLARS) {
    const value = Number(rawRatings[pillar.id]);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      errors[pillar.id] = "rating";
    } else {
      data.ratings[pillar.id] = value;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data };
}

export function ratingsFromReflection(reflection: {
  ratingCareer: number;
  ratingPersonal: number;
  ratingFinance: number;
  ratingRelationships: number;
  ratingMental: number;
  ratingPhysical: number;
}): OnboardingRatings {
  return {
    CAREER: reflection.ratingCareer,
    PERSONAL: reflection.ratingPersonal,
    FINANCE: reflection.ratingFinance,
    RELATIONSHIPS: reflection.ratingRelationships,
    MENTAL_HEALTH: reflection.ratingMental,
    PHYSICAL_HEALTH: reflection.ratingPhysical,
  };
}

export function reflectionToDraft(reflection: {
  lastYearStory: string;
  happiestMoment: string;
  keyLearnings: string;
  healingThings: string;
  expectationsNextYear: string;
  ratingCareer: number;
  ratingPersonal: number;
  ratingFinance: number;
  ratingRelationships: number;
  ratingMental: number;
  ratingPhysical: number;
}): OnboardingDraft {
  return {
    lastYearStory: reflection.lastYearStory,
    happiestMoment: reflection.happiestMoment,
    keyLearnings: reflection.keyLearnings,
    healingThings: reflection.healingThings,
    expectationsNextYear: reflection.expectationsNextYear,
    ratings: ratingsFromReflection(reflection),
  };
}
