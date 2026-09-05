import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createClient } from "@/lib/supabase/server";
import { findMonthPlan, patchMonthMemory } from "@/lib/month-plan/db";
import {
  DEFAULT_MEMORY_META,
  MEMORY_CAPTION_MAX,
  isYearMonth,
  type MemoryImageMeta,
} from "@/lib/month-plan/schema";
import { sniffAllowedImage } from "@/lib/images/allowlist";
import { consumeRateLimit, rateLimitResponse } from "@/lib/http/rate-limit";
import { forbidIfRenewal } from "@/lib/billing/guard";
import {
  removeVisionBoardObjects,
  visionBoardPathFromPublicUrl,
} from "@/lib/vision/storage";

const MAX_BYTES = 3 * 1024 * 1024;
const BUCKET = "vision-board";

function readMeta(raw: FormDataEntryValue | null): MemoryImageMeta {
  if (typeof raw !== "string") return { ...DEFAULT_MEMORY_META };
  try {
    const body = JSON.parse(raw) as MemoryImageMeta;
    return {
      offsetX: Math.min(40, Math.max(-40, Number(body.offsetX) || 0)),
      offsetY: Math.min(40, Math.max(-40, Number(body.offsetY) || 0)),
      scale: Math.min(2.5, Math.max(1, Number(body.scale) || 1)),
    };
  } catch {
    return { ...DEFAULT_MEMORY_META };
  }
}

function legacyMemoryPaths(userId: string, year: number, month: number) {
  const stem = `${userId}/memories/${year}-${String(month).padStart(2, "0")}`;
  return ["jpg", "jpeg", "png", "webp", "gif"].map((ext) => `${stem}.${ext}`);
}

function memoryPathsToRemove(
  userId: string,
  year: number,
  month: number,
  memoryImageUrl?: string | null,
) {
  const paths = legacyMemoryPaths(userId, year, month);
  if (memoryImageUrl) {
    const parsed = visionBoardPathFromPublicUrl(memoryImageUrl);
    if (parsed) paths.unshift(parsed);
  }
  return paths;
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const limited = await consumeRateLimit(`memory:${user.id}`, 30, 60 * 60 * 1000);
  if (!limited.ok) {
    const { status, headers } = rateLimitResponse(limited.retryAfterMs);
    return NextResponse.json({ ok: false, reason: "rate" }, { status, headers });
  }

  const form = await request.formData();
  const year = Number(form.get("year"));
  const month = Number(form.get("month"));
  if (!isYearMonth(year, month)) {
    return NextResponse.json({ ok: false, error: "period" }, { status: 400 });
  }

  const renew = forbidIfRenewal(auth.profile?.createdAt, year);
  if (renew) return renew;

  const captionRaw = form.get("caption");
  const caption =
    typeof captionRaw === "string" ? captionRaw.trim().slice(0, MEMORY_CAPTION_MAX) : undefined;
  const meta = readMeta(form.get("meta"));
  const file = form.get("file");

  if (!(file instanceof File)) {
    const plan = await patchMonthMemory(user.id, year, month, {
      ...(caption !== undefined ? { memoryCaption: caption } : {}),
      memoryImageMeta: meta,
    });
    return NextResponse.json({ ok: true, plan });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, reason: "size" }, { status: 413 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffAllowedImage(bytes, file.type);
  if (!sniffed) {
    return NextResponse.json({ ok: false, reason: "type" }, { status: 400 });
  }

  const existing = await findMonthPlan(user.id, year, month);
  const path = `${user.id}/memories/${crypto.randomUUID()}.${sniffed.ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(
    path,
    new Blob([bytes], { type: sniffed.mime }),
    { contentType: sniffed.mime, upsert: false },
  );
  if (error) {
    return NextResponse.json({ ok: false, reason: "storage" }, { status: 503 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const plan = await patchMonthMemory(user.id, year, month, {
    memoryImageUrl: data.publicUrl,
    ...(caption !== undefined ? { memoryCaption: caption } : {}),
    memoryImageMeta: meta,
  });

  await removeVisionBoardObjects(
    supabase,
    memoryPathsToRemove(user.id, year, month, existing?.memoryImageUrl),
  );

  return NextResponse.json({ ok: true, plan });
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  if (!isYearMonth(year, month)) {
    return NextResponse.json({ ok: false, error: "period" }, { status: 400 });
  }

  const existing = await findMonthPlan(user.id, year, month);
  const supabase = await createClient();
  if (supabase && existing?.memoryImageUrl) {
    await removeVisionBoardObjects(
      supabase,
      memoryPathsToRemove(user.id, year, month, existing.memoryImageUrl),
    );
  }

  const plan = await patchMonthMemory(user.id, year, month, {
    memoryImageUrl: null,
    memoryCaption: "",
    memoryImageMeta: { ...DEFAULT_MEMORY_META },
  });

  return NextResponse.json({ ok: true, plan });
}
