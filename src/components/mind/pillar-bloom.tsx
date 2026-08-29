import { PILLARS, type PillarId } from "@/lib/pillars";

type Props = {
  covered: PillarId[];
};

export function PillarBloom({ covered }: Props) {
  const cx = 60;
  const cy = 60;
  const petals = PILLARS.map((pillar, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / PILLARS.length;
    return {
      id: pillar.id,
      color: pillar.color,
      x: cx + Math.cos(angle) * 22,
      y: cy + Math.sin(angle) * 22,
      ok: covered.includes(pillar.id),
    };
  });

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      {petals.map((petal) => (
        <circle
          key={petal.id}
          cx={petal.x}
          cy={petal.y}
          r="16"
          fill={petal.color}
          opacity={petal.ok ? 0.92 : 0.18}
        />
      ))}
      <circle cx={cx} cy={cy} r="11" fill="#ffffff" stroke="#e2e8f0" />
    </svg>
  );
}
