"use client";

import { PLAN, formatMbLimit } from "@/lib/billing/plan";

export function QuotaHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-muted">{children}</p>;
}

export function todoQuotaLabel(used: number, limit = PLAN.free.todosPerDay) {
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export function visionQuotaLabel(objects: number, bytes: number) {
  return {
    objects,
    objectLimit: PLAN.free.visionObjects,
    bytesLabel: formatMbLimit(bytes),
  };
}
