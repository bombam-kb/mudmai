import { PILLARS, type PillarId } from "@/lib/pillars";
import { analyzePillarCoverage } from "@/lib/onboarding/completeness";
import type { MonthGoalDto } from "@/lib/month-plan/schema";

export type MonthPillarCoverage = {
  covered: PillarId[];
  missing: PillarId[];
  empty: boolean;
};

export function monthPlanPillarCoverage(
  note: string,
  goals: MonthGoalDto[],
): MonthPillarCoverage {
  const text = [note, ...goals.map((goal) => goal.title)]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
  const fromText = analyzePillarCoverage(text)?.covered ?? [];
  const fromTags = goals
    .map((goal) => goal.pillar)
    .filter((pillar): pillar is PillarId => Boolean(pillar));
  const covered = PILLARS.map((pillar) => pillar.id).filter(
    (id) => fromText.includes(id) || fromTags.includes(id),
  );
  const missing = PILLARS.map((pillar) => pillar.id).filter(
    (id) => !covered.includes(id),
  );

  return {
    covered,
    missing,
    empty: !text && fromTags.length === 0,
  };
}
