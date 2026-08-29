"use client";

import { ValencePicker } from "@/components/mind/valence-picker";
import type { PillarId } from "@/lib/pillars";
import type { OnboardingRatings } from "@/lib/onboarding/schema";

type Props = {
  ratings: OnboardingRatings;
  lastYear: number;
  onChange: (pillar: PillarId, value: number) => void;
};

export function RatingsStep({ ratings, lastYear, onChange }: Props) {
  return (
    <ValencePicker
      ratings={ratings}
      lastYear={lastYear}
      onChange={onChange}
      showIntro
    />
  );
}
