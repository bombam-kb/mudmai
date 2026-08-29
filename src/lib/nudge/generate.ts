import type { NudgeTriggerId } from "@/lib/nudge/schema";
import { consumeRateLimit } from "@/lib/http/rate-limit";
import { prisma } from "@/lib/prisma";

function clip(value: string, max = 90) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function fallbackText(
  trigger: NudgeTriggerId,
  locale: "th" | "en",
  context: Record<string, unknown>,
) {
  const healing = clip(String(context.healingThings ?? ""));
  const happiest = clip(String(context.happiestMoment ?? ""));
  const expect = clip(String(context.expectationsNextYear ?? ""));
  const rating = Number(context.rating) || 0;
  const rate = Number(context.rate) || 0;

  if (locale === "th") {
    if (trigger === "LOW_MENTAL_SCORE") {
      return `คะแนนสุขภาพจิตเดือนนี้อยู่ที่ ${rating}/5 — ไม่เป็นไรนะ จำได้ไหมว่าเคยเยียวยาตัวเองด้วยแบบนี้: ${healing || "สิ่งเล็ก ๆ ที่ทำให้ใจเบา"} และโมเมนต์ที่สุขอย่าง ${happiest || "ช่วงที่ใจดี"} ยังอยู่กับคุณ ค่อย ๆ หายใจ แล้วเลือกก้าวเล็ก ๆ พอวันนี้`;
    }
    if (trigger === "LOW_CAREER_SCORE") {
      return `การงานเดือนนี้รู้สึกหนัก (${rating}/5) เราไม่เร่งคุณ ขอแค่เตือนสิ่งที่เคยพยุงคุณไว้: ${healing || "สิ่งที่เคยเยียวยา"} และความสุขอย่าง ${happiest || "โมเมนต์ที่อบอุ่น"} ยังพาคุณมาถึงตรงนี้ได้ พักได้ แล้วค่อยเดินต่อ`;
    }
    return `งาน 7 วันล่าสุดเสร็จราว ${rate}% เท่านั้น ยังไม่สายเลย ปีนี้คุณตั้งใจไว้ว่า ${expect || "อยากเดินทางต่ออย่างอ่อนโยน"} — เลือกทำข้อเล็ก ๆ ข้อเดียววันนี้ก็พอ ไม่ต้องตามให้ทันทั้งสัปดาห์`;
  }

  if (trigger === "LOW_MENTAL_SCORE") {
    return `This month’s mental-health score is ${rating}/5. No judgment. You once healed with: ${healing || "something small that lightened you"} — and ${happiest || "a happy stretch"} still belongs to you. Breathe. One gentle step today is enough.`;
  }
  if (trigger === "LOW_CAREER_SCORE") {
    return `Career feels heavy this month (${rating}/5). We’re not rushing you — only recalling what held you: ${healing || "what healed you"} and ${happiest || "a warm moment"}. Rest is allowed. Then one small next step.`;
  }
  return `Todos over the last 7 days are about ${rate}% done. That’s a slump, not a verdict. You hoped this year: ${expect || "to keep walking kindly"}. Pick one tiny task today. You don’t have to catch the whole week.`;
}

type ChatMessage = { role: "system" | "user"; content: string };

async function generateWithOpenAI(messages: ChatMessage[]) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 160,
      messages,
    }),
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  return text || null;
}

function systemPrompt(locale: "th" | "en") {
  if (locale === "th") {
    return "คุณเป็นเพื่อนเดินทางในแอปหมุดหมาย เขียนข้อความสั้น อบอุ่น ไม่ตัดสิน ไม่ทำให้รู้สึกผิด ไม่เกิน 60 คำ ภาษาไทย เป็นกันเอง ห้ามขึ้นต้นด้วยการทักทายยาว ห้ามใส่หัวข้อ ตอบเป็นข้อความเดียว";
  }
  return "You are a companion in Mudmai. Write a warm, non-judgmental, no-guilt nudge under 60 words in English. No long greeting, no heading. Reply with the nudge only.";
}

function userPrompt(
  trigger: NudgeTriggerId,
  locale: "th" | "en",
  context: Record<string, unknown>,
) {
  const payload = JSON.stringify(context);
  if (trigger === "TASK_SLUMP") {
    return locale === "th"
      ? `งาน 7 วันล่าสุดค้าง (completion < 30%). ใช้ความคาดหวังปีนี้ของผู้ใช้ น้ำเสียงพี่เลี้ยงที่ห่วงใย สั้น ๆ ไม่ตำหนิ\nบริบท: ${payload}`
      : `Todo completion over 7 days is under 30%. Use their next-year expectation. Caring mentor, brief, no guilt.\nContext: ${payload}`;
  }
  const pillar = trigger === "LOW_MENTAL_SCORE" ? "mental health" : "career";
  return locale === "th"
    ? `คะแนนรีวิวรายเดือนด้าน ${pillar} <= 2. ใช้สิ่งที่เคยเยียวยา และโมเมนต์ที่สุข น้ำเสียงอบอุ่น ไม่ตัดสิน\nบริบท: ${payload}`
    : `Monthly review ${pillar} score is <= 2. Use what healed them and a happiest moment. Warm, non-judgmental.\nContext: ${payload}`;
}

export async function generateNudgeText(
  trigger: NudgeTriggerId,
  locale: "th" | "en",
  contextUsed: string,
) {
  let context: Record<string, unknown> = {};
  try {
    context = JSON.parse(contextUsed) as Record<string, unknown>;
  } catch {
    context = {};
  }

  const ai = await generateWithOpenAI([
    { role: "system", content: systemPrompt(locale) },
    { role: "user", content: userPrompt(trigger, locale, context) },
  ]).catch(() => null);

  return ai || fallbackText(trigger, locale, context);
}

export function generateNudgeTextSync(
  trigger: NudgeTriggerId,
  locale: "th" | "en",
  contextUsed: string,
) {
  let context: Record<string, unknown> = {};
  try {
    context = JSON.parse(contextUsed) as Record<string, unknown>;
  } catch {
    context = {};
  }
  return fallbackText(trigger, locale, context);
}

export async function upgradeNudgeText(
  id: string,
  userId: string,
  trigger: NudgeTriggerId,
  locale: "th" | "en",
  contextUsed: string,
) {
  if (!(await consumeRateLimit(`nudge-ai:${userId}`, 6, 60 * 60 * 1000)).ok) return;

  const text = await generateNudgeText(trigger, locale, contextUsed).catch(() => null);
  const fallback = generateNudgeTextSync(trigger, locale, contextUsed);
  if (!text || text === fallback) return;

  await prisma.aiNudgeLog
    .update({
      where: { id },
      data: { nudgeText: text },
    })
    .catch(() => null);
}
