"use client";

const VALENCE = [
  { fill: "#E85D4C", radius: "42% 58% 63% 37% / 44% 36% 64% 56%" },
  { fill: "#F4A261", radius: "46% 54% 58% 42% / 48% 40% 60% 52%" },
  { fill: "#94A3B8", radius: "50% 50% 50% 50% / 50% 50% 50% 50%" },
  { fill: "#34D399", radius: "54% 46% 48% 52% / 46% 56% 44% 54%" },
  { fill: "#22D3EE", radius: "58% 42% 44% 56% / 52% 58% 42% 48%" },
] as const;

export function valenceStyle(value: number) {
  const index = Math.min(5, Math.max(1, Math.round(value))) - 1;
  return VALENCE[index];
}

export function ValenceOrb({
  value,
  size = 56,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const style = valenceStyle(value || 3);
  const active = value >= 1;

  return (
    <span
      className={`mind-orb inline-block ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: style.radius,
        background: active
          ? `radial-gradient(circle at 35% 30%, #ffffffcc, ${style.fill})`
          : "#e2e8f0",
        opacity: active ? 1 : 0.55,
      }}
      aria-hidden
    />
  );
}
