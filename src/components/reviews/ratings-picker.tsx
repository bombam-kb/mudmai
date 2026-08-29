"use client";

import { ValencePicker } from "@/components/mind/valence-picker";
import type { PillarId } from "@/lib/pillars";
import type { OnboardingRatings } from "@/lib/onboarding/schema";

type Props = {
  ratings: OnboardingRatings;
  onChange: (pillar: PillarId, value: number) => void;
};

export function RatingsPicker({ ratings, onChange }: Props) {
  return <ValencePicker ratings={ratings} onChange={onChange} />;
}
