export const PILLARS = [
  {
    id: "CAREER",
    color: "#2563EB",
    labelTh: "การงาน",
    labelEn: "Career",
  },
  {
    id: "PERSONAL",
    color: "#8B5CF6",
    labelTh: "ชีวิตส่วนตัว",
    labelEn: "Personal",
  },
  {
    id: "FINANCE",
    color: "#10B981",
    labelTh: "การเงิน",
    labelEn: "Finance",
  },
  {
    id: "RELATIONSHIPS",
    color: "#EC4899",
    labelTh: "ความสัมพันธ์",
    labelEn: "Relationships",
  },
  {
    id: "MENTAL_HEALTH",
    color: "#06B6D4",
    labelTh: "สุขภาพจิต",
    labelEn: "Mental health",
  },
  {
    id: "PHYSICAL_HEALTH",
    color: "#F97316",
    labelTh: "สุขภาพกาย",
    labelEn: "Physical health",
  },
] as const;

export type PillarId = (typeof PILLARS)[number]["id"];

export const PILLAR_MAP = Object.fromEntries(
  PILLARS.map((pillar) => [pillar.id, pillar]),
) as Record<PillarId, (typeof PILLARS)[number]>;

export function pillarLabel(id: PillarId, locale: "th" | "en") {
  const pillar = PILLAR_MAP[id];
  return locale === "th" ? pillar.labelTh : pillar.labelEn;
}

export function goalProgressPercent(currentValue: number, targetValue: number) {
  if (!targetValue) return 0;
  return Math.min(100, Math.max(0, (currentValue / targetValue) * 100));
}
