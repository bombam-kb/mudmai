import { PILLARS, type PillarId } from "@/lib/pillars";

const PILLAR_TERMS: Record<PillarId, string[]> = {
  CAREER: [
    "งาน",
    "อาชีพ",
    "บริษัท",
    "ออฟฟิศ",
    "โปรเจกต์",
    "โปรเจค",
    "kpi",
    "เดดไลน์",
    "deadline",
    "ทีม",
    "ลูกค้า",
    "ตำแหน่ง",
    "เลื่อน",
    "เรียน",
    "ทำงาน",
    "เจ้านาย",
    "เพื่อนร่วมงาน",
    "สัมภาษณ์",
    "ลาออก",
    "ธุรกิจ",
    "เรียนต่อ",
    "เลื่อนตำแหน่ง",
    "career",
    "work",
    "job",
    "office",
    "project",
    "promotion",
    "boss",
    "colleague",
    "interview",
    "resign",
    "freelance",
    "study",
  ],
  PERSONAL: [
    "บ้าน",
    "ส่วนตัว",
    "ชีวิตตัวเอง",
    "ห้อง",
    "ย้าย",
    "เวลาว่าง",
    "งานอดิเรก",
    "อยู่คนเดียว",
    "จัดบ้าน",
    "กิจวัตร",
    "เวลาให้ตัวเอง",
    "บาลานซ์",
    "hobby",
    "personal",
    "home",
    "myself",
    "alone",
    "apartment",
    "routine",
    "moved",
  ],
  FINANCE: [
    "เงิน",
    "ออม",
    "เก็บเงิน",
    "หนี้",
    "รายได้",
    "เงินเดือน",
    "ค่าใช้จ่าย",
    "ลงทุน",
    "ประหยัด",
    "บัตรเครดิต",
    "งบ",
    "ฉุกเฉิน",
    "finance",
    "money",
    "save",
    "saving",
    "debt",
    "salary",
    "spend",
    "invest",
    "budget",
    "income",
  ],
  RELATIONSHIPS: [
    "ครอบครัว",
    "เพื่อน",
    "คนรัก",
    "พ่อ",
    "แม่",
    "พี่",
    "น้อง",
    "คู่",
    "แฟน",
    "ความสัมพันธ์",
    "แต่งงาน",
    "family",
    "friend",
    "partner",
    "relationship",
    "mom",
    "dad",
    "boyfriend",
    "girlfriend",
    "parents",
  ],
  MENTAL_HEALTH: [
    "สุขภาพจิต",
    "เครียด",
    "เหนื่อยใจ",
    "เบิร์น",
    "หมดไฟ",
    "สงบ",
    "วิตก",
    "ซึม",
    "เหงา",
    "โล่ง",
    "หายใจ",
    "mental",
    "stress",
    "burnout",
    "anxiety",
    "depress",
    "peace",
    "lonely",
    "overwhelm",
    "calm",
  ],
  PHYSICAL_HEALTH: [
    "สุขภาพกาย",
    "ร่างกาย",
    "วิ่ง",
    "ออกกำลัง",
    "ป่วย",
    "ฟิต",
    "ยิม",
    "อาหาร",
    "น้ำหนัก",
    "นอน",
    "ปวด",
    "เดิน",
    "physical",
    "gym",
    "run",
    "workout",
    "sick",
    "sleep",
    "body",
    "weight",
    "diet",
    "walk",
  ],
};

const CONNECTORS = [
  "แต่",
  "เพราะ",
  "เลย",
  "จน",
  "แล้ว",
  "จึง",
  "and",
  "but",
  "because",
  "then",
  "so",
  "until",
];

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasTerm(haystack: string, term: string) {
  if (/^[a-z]+$/i.test(term)) {
    return new RegExp(`\\b${term}\\b`, "i").test(haystack);
  }
  return haystack.includes(term.toLowerCase());
}

export type CompletenessResult = {
  covered: PillarId[];
  missing: PillarId[];
  coveragePercent: number;
  sentencePercent: number;
};

export function analyzePillarCoverage(raw: string): CompletenessResult | null {
  const text = normalize(raw);
  if (!text) return null;

  const covered = PILLARS.filter((pillar) =>
    PILLAR_TERMS[pillar.id].some((term) => hasTerm(text, term)),
  ).map((pillar) => pillar.id);

  const missing = PILLARS.map((pillar) => pillar.id).filter(
    (id) => !covered.includes(id),
  );

  const coveragePercent = Math.round((covered.length / PILLARS.length) * 100);

  const chars = text.length;
  const lengthScore =
    chars < 24 ? 18 : chars < 60 ? 45 : chars < 120 ? 70 : chars < 700 ? 92 : 80;

  const sentences = text.split(/[.!?。\n]+/).filter((part) => part.trim().length > 8);
  const structureScore = Math.min(
    100,
    (sentences.length >= 2 ? 55 : 28) +
      (CONNECTORS.some((word) => hasTerm(text, word)) ? 25 : 0) +
      (/[,，、]/.test(text) ? 10 : 0),
  );

  const specificityScore = Math.min(100, 20 + covered.length * 14);

  const sentencePercent = Math.max(
    8,
    Math.min(
      98,
      Math.round(lengthScore * 0.4 + structureScore * 0.3 + specificityScore * 0.3),
    ),
  );

  return { covered, missing, coveragePercent, sentencePercent };
}
