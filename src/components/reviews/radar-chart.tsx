"use client";

import { PILLARS, type PillarId } from "@/lib/pillars";
import type { OnboardingRatings } from "@/lib/onboarding/schema";

type Props = {
  ratings: OnboardingRatings;
  compare?: OnboardingRatings | null;
};

export function RadarChart({ ratings, compare }: Props) {
  const cx = 140;
  const cy = 140;
  const maxR = 100;
  const points = PILLARS.map((pillar, index) => {
    const angle = (-Math.PI / 2) + (index * 2 * Math.PI) / PILLARS.length;
    return { pillar, angle };
  });

  function ring(value: number) {
    return points
      .map(({ angle }) => {
        const r = (value / 5) * maxR;
        return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
      })
      .join(" ");
  }

  function polygon(values: OnboardingRatings) {
    return points
      .map(({ pillar, angle }) => {
        const r = (Math.max(0, values[pillar.id as PillarId]) / 5) * maxR;
        return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
      })
      .join(" ");
  }

  return (
    <svg viewBox="0 0 280 280" className="mx-auto h-auto w-full max-w-[16rem]">
      {[1, 2, 3, 4, 5].map((value) => (
        <polygon
          key={value}
          points={ring(value)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
      ))}
      {points.map(({ pillar, angle }) => (
        <line
          key={pillar.id}
          x1={cx}
          y1={cy}
          x2={cx + Math.cos(angle) * maxR}
          y2={cy + Math.sin(angle) * maxR}
          stroke="#e2e8f0"
        />
      ))}
      {compare ? (
        <polygon
          points={polygon(compare)}
          fill="rgba(100,116,139,0.12)"
          stroke="#94a3b8"
          strokeWidth="2"
        />
      ) : null}
      <polygon
        points={polygon(ratings)}
        fill="rgba(124,58,237,0.2)"
        stroke="#7c3aed"
        strokeWidth="2"
      />
      {points.map(({ pillar, angle }) => (
        <circle
          key={`${pillar.id}-label`}
          cx={cx + Math.cos(angle) * 118}
          cy={cy + Math.sin(angle) * 118}
          r="6"
          fill={pillar.color}
        />
      ))}
    </svg>
  );
}
