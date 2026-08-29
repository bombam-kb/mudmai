import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { activeCalendarYear } from "@/lib/year";
import { itemsFromSnapshot, snapshotForPersist, countVisionObjects, estimateVisionBytes } from "@/lib/vision/snapshot";
import { rateLimitJson } from "@/lib/http/rate-limit";
import { forbidIfRenewal, forbidIfVisionBytes, forbidIfVisionObjects } from "@/lib/billing/guard";
import { PLAN } from "@/lib/billing/plan";
import { sumVisionStorageBytes } from "@/lib/billing/vision-usage";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const year = activeCalendarYear();
  const canvas = await prisma.visionCanvas
    .findUnique({
      where: { userId_year: { userId: user.id, year } },
    })
    .catch(() => null);

  const objects = countVisionObjects(canvas?.canvasJson ?? null);
  const bytes = await sumVisionStorageBytes(user.id, year).catch(() => 0);

  return NextResponse.json({
    ok: true,
    year,
    canvasJson: canvas?.canvasJson ?? null,
    quota: {
      objects,
      objectLimit: PLAN.free.visionObjects,
      bytes,
      byteLimit: PLAN.free.visionBytes,
    },
  });
}

export async function PUT(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`vision-write:${user.id}`, 40);
  if (limited) return limited;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const raw = await request.text();
  if (raw.length > 1_500_000) {
    return NextResponse.json({ ok: false, reason: "size" }, { status: 413 });
  }

  const body = (() => {
    try {
      return JSON.parse(raw) as { canvasJson?: unknown };
    } catch {
      return null;
    }
  })();

  if (!body?.canvasJson) {
    return NextResponse.json({ ok: false, reason: "payload" }, { status: 400 });
  }

  const year = activeCalendarYear();
  const renew = forbidIfRenewal(auth.profile?.createdAt, year);
  if (renew) return renew;

  const objects = countVisionObjects(body.canvasJson);
  const objectLimit = forbidIfVisionObjects(objects);
  if (objectLimit) return objectLimit;
  const canvasJson = snapshotForPersist(body.canvasJson);
  const bytesLimit = forbidIfVisionBytes(estimateVisionBytes(canvasJson));
  if (bytesLimit) return bytesLimit;
  const items = itemsFromSnapshot(canvasJson, year).map((item) => ({
    ...item,
    userId: user.id,
  }));

  await prisma.$transaction(async (tx) => {
    await tx.visionCanvas.upsert({
      where: { userId_year: { userId: user.id, year } },
      create: { userId: user.id, year, canvasJson },
      update: { canvasJson },
    });
    await tx.visionBoardItem.deleteMany({ where: { userId: user.id, year } });
    if (items.length > 0) {
      await tx.visionBoardItem.createMany({ data: items });
    }
  });

  return NextResponse.json({ ok: true, year, itemCount: items.length });
}
