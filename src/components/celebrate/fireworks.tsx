"use client";

import { useMemo } from "react";

const COLORS = ["#7c3aed", "#22d3ee", "#10b981", "#ec4899", "#f97316", "#2563eb"];
const BURSTS = [
  { left: "14%", top: "18%" },
  { left: "86%", top: "16%" },
  { left: "50%", top: "10%" },
  { left: "22%", top: "72%" },
  { left: "78%", top: "70%" },
  { left: "6%", top: "46%" },
  { left: "94%", top: "42%" },
];

type Spark = {
  id: string;
  left: string;
  top: string;
  color: string;
  dx: string;
  dy: string;
  delay: number;
  size: number;
};

function buildSparks(): Spark[] {
  return [0, 1].flatMap((wave) =>
    BURSTS.flatMap((burst, burstIndex) =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2 + burstIndex * 0.14 + wave * 0.2;
        const dist = 110 + (i % 5) * 36 + wave * 20;
        return {
          id: `${wave}-${burstIndex}-${i}`,
          left: burst.left,
          top: burst.top,
          color: COLORS[(i + burstIndex + wave) % COLORS.length],
          dx: `${Math.cos(angle) * dist}px`,
          dy: `${Math.sin(angle) * dist - 18}px`,
          delay: wave * 1600 + burstIndex * 220 + (i % 4) * 90,
          size: 6 + (i % 3) * 2,
        };
      }),
    ),
  );
}

export function FireworksLayer({ className = "" }: { className?: string }) {
  const sparks = useMemo(buildSparks, []);

  return (
    <div className={`celebrate-burst ${className}`.trim()} aria-hidden>
      {BURSTS.map((burst, i) => (
        <span
          key={`ring-${i}`}
          className="celebrate-ring"
          style={{
            left: burst.left,
            top: burst.top,
            animationDelay: `${i * 220}ms`,
          }}
        />
      ))}
      {sparks.map((spark) => (
        <span
          key={spark.id}
          className="celebrate-spark"
          style={{
            left: spark.left,
            top: spark.top,
            width: spark.size,
            height: spark.size,
            background: spark.color,
            animationDelay: `${spark.delay}ms`,
            ["--dx" as string]: spark.dx,
            ["--dy" as string]: spark.dy,
          }}
        />
      ))}
    </div>
  );
}
