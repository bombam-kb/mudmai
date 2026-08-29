import { NextResponse } from "next/server";
import { PLAN, canWriteInYear, isPaidPlan } from "@/lib/billing/plan";

export function forbidIfRenewal(createdAt: Date | null | undefined, year: number, plan?: string | null) {
  if (!createdAt) return null;
  if (canWriteInYear({ createdAt, paid: isPaidPlan(plan), year })) return null;
  return NextResponse.json(
    {
      ok: false,
      error: "renew",
      year,
      prices: { yearlyThb: PLAN.yearlyThb, founderThb: PLAN.founderThb },
    },
    { status: 402 },
  );
}

export function forbidIfTodoQuota(used: number, adding = 1) {
  if (used + adding <= PLAN.free.todosPerDay) return null;
  return NextResponse.json(
    {
      ok: false,
      error: "todo_quota",
      used,
      limit: PLAN.free.todosPerDay,
    },
    { status: 403 },
  );
}

export function forbidIfVisionObjects(count: number) {
  if (count <= PLAN.free.visionObjects) return null;
  return NextResponse.json(
    {
      ok: false,
      error: "vision_objects",
      used: count,
      limit: PLAN.free.visionObjects,
    },
    { status: 403 },
  );
}

export function forbidIfVisionBytes(used: number, incoming = 0) {
  if (used + incoming <= PLAN.free.visionBytes) return null;
  return NextResponse.json(
    {
      ok: false,
      error: "vision_bytes",
      used,
      incoming,
      limit: PLAN.free.visionBytes,
    },
    { status: 403 },
  );
}
