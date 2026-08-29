"use client";

import { PILLARS } from "@/lib/pillars";
import type { MonthlyReviewDto } from "@/lib/reviews/schema";
import { useTranslations } from "next-intl";

type Props = {
  year: number;
  reviews: MonthlyReviewDto[];
};

export function PillarTrendChart({ year, reviews }: Props) {
  const t = useTranslations("calendar");
  const byMonth = new Map(reviews.map((review) => [review.month, review]));
  const width = 640;
  const height = 240;
  const left = 36;
  const right = 16;
  const top = 16;
  const bottom = 36;
  const innerW = width - left - right;
  const innerH = height - top - bottom;

  function x(month: number) {
    return left + ((month - 1) / 11) * innerW;
  }
  function y(value: number) {
    return top + innerH - (value / 5) * innerH;
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 min-w-[36rem] w-full">
        {[1, 2, 3, 4, 5].map((value) => (
          <g key={value}>
            <line
              x1={left}
              x2={width - right}
              y1={y(value)}
              y2={y(value)}
              stroke="#e2e8f0"
            />
            <text x={4} y={y(value) + 4} fontSize="11" fill="#64748b">
              {value}
            </text>
          </g>
        ))}
        {PILLARS.map((pillar) => {
          const coords = Array.from({ length: 12 }, (_, index) => {
            const month = index + 1;
            const review = byMonth.get(month);
            if (!review) return null;
            return `${x(month)},${y(review.ratings[pillar.id])}`;
          }).filter(Boolean);
          if (coords.length < 2) return null;
          return (
            <polyline
              key={pillar.id}
              points={coords.join(" ")}
              fill="none"
              stroke={pillar.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
        {PILLARS.map((pillar) =>
          Array.from({ length: 12 }, (_, index) => {
            const month = index + 1;
            const review = byMonth.get(month);
            if (!review) return null;
            return (
              <circle
                key={`${pillar.id}-${month}`}
                cx={x(month)}
                cy={y(review.ratings[pillar.id])}
                r="3.5"
                fill={pillar.color}
              />
            );
          }),
        )}
        {Array.from({ length: 12 }, (_, index) => (
          <text
            key={index}
            x={x(index + 1)}
            y={height - 8}
            textAnchor="middle"
            fontSize="11"
            fill="#64748b"
          >
            {t(`months.${index + 1}`).slice(0, 3)}
          </text>
        ))}
      </svg>
      <p className="sr-only">
        {year} pillar ratings
      </p>
    </div>
  );
}
