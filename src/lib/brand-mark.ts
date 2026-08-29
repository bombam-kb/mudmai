import { PILLARS } from "@/lib/pillars";

/** Compass-pin mark in a 24×24 viewBox. Colors come from the six pillars. */
export const BRAND_PIN_PATH =
  "M12 21.8C12 21.8 5.15 14.55 5.15 9.55a6.85 6.85 0 1 1 13.7 0C18.85 14.55 12 21.8 12 21.8Z";

export const BRAND_MARK_CENTER = { x: 12, y: 9.55 };
export const BRAND_MARK_RING_R = 4.15;
export const BRAND_MARK_DOT_R = 1.4;
export const BRAND_PURPLE = "#7C3AED";

/** Six pillar dots on a ring, offset so the pin point sits between two dots. */
export function brandMarkDots() {
  return PILLARS.map((pillar, index) => {
    const angle = ((-60 + index * 60) * Math.PI) / 180;
    return {
      cx: roundMark(BRAND_MARK_CENTER.x + BRAND_MARK_RING_R * Math.cos(angle)),
      cy: roundMark(BRAND_MARK_CENTER.y + BRAND_MARK_RING_R * Math.sin(angle)),
      fill: pillar.color,
    };
  });
}

function roundMark(value: number) {
  return Math.round(value * 100) / 100;
}
