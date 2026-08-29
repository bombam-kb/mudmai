import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Bucket = { count: number; resetAt: number };

const memory = new Map<string, Bucket>();
export const RATE_LIMIT_HOUR = 60 * 60 * 1000;

function consumeMemory(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = memory.get(key);
  if (!current || now >= current.resetAt) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, remaining: limit - 1 };
  }
  if (current.count >= limit) {
    return {
      ok: false as const,
      remaining: 0,
      retryAfterMs: current.resetAt - now,
    };
  }
  current.count += 1;
  return { ok: true as const, remaining: limit - current.count };
}

export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  if (!process.env.DATABASE_URL) {
    return consumeMemory(key, limit, windowMs);
  }

  const resetAt = new Date(Date.now() + windowMs);
  try {
    const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
          ELSE "RateLimitBucket"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${resetAt}
          ELSE "RateLimitBucket"."resetAt"
        END
      RETURNING "count", "resetAt"
    `;
    const row = rows[0];
    if (!row) return consumeMemory(key, limit, windowMs);
    if (row.count > limit) {
      return {
        ok: false as const,
        remaining: 0,
        retryAfterMs: Math.max(0, new Date(row.resetAt).getTime() - Date.now()),
      };
    }
    return { ok: true as const, remaining: Math.max(0, limit - row.count) };
  } catch {
    return consumeMemory(key, limit, windowMs);
  }
}

export function rateLimitResponse(retryAfterMs: number) {
  return {
    status: 429 as const,
    headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
  };
}

export async function rateLimitJson(key: string, limit: number, windowMs = RATE_LIMIT_HOUR) {
  const limited = await consumeRateLimit(key, limit, windowMs);
  if (limited.ok) return null;
  const { status, headers } = rateLimitResponse(limited.retryAfterMs);
  return NextResponse.json({ ok: false, error: "rate" }, { status, headers });
}
