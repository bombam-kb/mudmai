import { PILLARS } from "@/lib/pillars";

const TRAIL =
  "M-40 120C80 40 160 210 280 155C400 100 455 28 580 95C720 170 790 310 930 245C1060 185 1140 70 1280 140C1400 200 1480 330 1580 270";

const PINS = [
  { x: 92, y: 118 },
  { x: 280, y: 155 },
  { x: 580, y: 95 },
  { x: 930, y: 245 },
  { x: 1280, y: 140 },
  { x: 1488, y: 292 },
] as const;

function Pin({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M0 11C0 11-5.2 4.6-5.2.4a5.2 5.2 0 1 1 10.4 0C5.2 4.6 0 11 0 11Z"
        fill={color}
      />
      <circle cx="0" cy="0.2" r="1.7" fill="#fff" />
    </g>
  );
}

/** Decorative dashed waypoint trail for marketing pages. */
export function WaypointTrail({ className }: { className?: string }) {
  return (
    <svg
      className={`jr-waypoint-trail ${className ?? ""}`}
      viewBox="0 0 1440 520"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <path
        d={TRAIL}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="7 11"
        className="jr-waypoint-stroke"
      />
      {PILLARS.map((pillar, index) => (
        <Pin
          key={pillar.id}
          x={PINS[index]!.x}
          y={PINS[index]!.y}
          color={pillar.color}
        />
      ))}
    </svg>
  );
}
