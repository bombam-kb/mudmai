import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createClient } from "@/lib/supabase/server";
import { activeCalendarYear } from "@/lib/year";
import { sniffAllowedImage } from "@/lib/images/allowlist";
import { consumeRateLimit, rateLimitResponse } from "@/lib/http/rate-limit";
import { forbidIfRenewal, forbidIfVisionBytes } from "@/lib/billing/guard";
import { PLAN } from "@/lib/billing/plan";
import { sumVisionStorageBytes } from "@/lib/billing/vision-usage";

const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const limited = await consumeRateLimit(`upload:${user.id}`, 20, 60 * 60 * 1000);
  if (!limited.ok) {
    const { status, headers } = rateLimitResponse(limited.retryAfterMs);
    return NextResponse.json({ ok: false, reason: "rate" }, { status, headers });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, reason: "file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, reason: "size" }, { status: 413 });
  }

  const year = activeCalendarYear();
  const renew = forbidIfRenewal(auth.profile?.createdAt, year);
  if (renew) return renew;
  const used = await sumVisionStorageBytes(user.id, year);
  const bytesLimit = forbidIfVisionBytes(used, file.size);
  if (bytesLimit) return bytesLimit;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffAllowedImage(bytes, file.type);
  if (!sniffed) {
    return NextResponse.json({ ok: false, reason: "type" }, { status: 400 });
  }

  const path = `${user.id}/${year}/${crypto.randomUUID()}.${sniffed.ext}`;

  const { error } = await supabase.storage.from("vision-board").upload(
    path,
    new Blob([bytes], { type: sniffed.mime }),
    {
      contentType: sniffed.mime,
      upsert: false,
    },
  );

  if (error) {
    return NextResponse.json({ ok: false, reason: "storage" }, { status: 503 });
  }

  const { data } = supabase.storage.from("vision-board").getPublicUrl(path);
  return NextResponse.json({
    ok: true,
    url: data.publicUrl,
    quota: { used: used + file.size, limit: PLAN.free.visionBytes },
  });
}
