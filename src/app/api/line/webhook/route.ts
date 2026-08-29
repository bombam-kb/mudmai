import { NextResponse } from "next/server";
import { isLineMessagingConfigured } from "@/lib/env";
import { verifyLineWebhookSignature } from "@/lib/line/signature";
import { handleLineEvents } from "@/lib/line/webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isLineMessagingConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const raw = await request.text();
  const ok = verifyLineWebhookSignature(
    process.env.LINE_MESSAGING_CHANNEL_SECRET ?? "",
    raw,
    request.headers.get("x-line-signature"),
  );
  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let events: unknown[] = [];
  try {
    const body = JSON.parse(raw) as { events?: unknown[] };
    events = Array.isArray(body.events) ? body.events : [];
  } catch {
    return NextResponse.json({ ok: true });
  }

  await handleLineEvents(events as Parameters<typeof handleLineEvents>[0]).catch(() => null);
  return NextResponse.json({ ok: true });
}
