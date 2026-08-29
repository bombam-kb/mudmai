import { isYmd } from "@/lib/year";

export const MOOD_LEVELS = [
  { level: 1, emoji: "😩", key: "awful" },
  { level: 2, emoji: "🙁", key: "low" },
  { level: 3, emoji: "😐", key: "ok" },
  { level: 4, emoji: "🙂", key: "good" },
  { level: 5, emoji: "🤩", key: "great" },
] as const;

export type MoodLevel = (typeof MOOD_LEVELS)[number]["level"];

export function isMoodLevel(value: unknown): value is MoodLevel {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

export function parseMoodPut(input: unknown):
  | { ok: true; date: string; level: MoodLevel }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "payload" };
  const body = input as Record<string, unknown>;
  const date = typeof body.date === "string" ? body.date : "";
  if (!isYmd(date)) return { ok: false, error: "date" };
  const level = Number(body.level);
  if (!isMoodLevel(level)) return { ok: false, error: "level" };
  return { ok: true, date, level };
}

export function moodMeta(level: MoodLevel | null) {
  if (!level) return null;
  return MOOD_LEVELS.find((item) => item.level === level) ?? null;
}
