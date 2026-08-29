import { NextResponse } from "next/server";
import type { BillingPlan } from "@prisma/client";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { rateLimitJson } from "@/lib/http/rate-limit";
import {
  amountForPlan,
  paidPlanFromCheckout,
  parseCheckoutPlan,
} from "@/lib/billing/plan";

function toDto(row: {
  plan: BillingPlan;
  amountThb: number;
  status: string;
  listPriceThb?: number | null;
  discountThb?: number;
}) {
  return {
    plan: row.plan,
    amountThb: row.amountThb,
    status: row.status,
    listPriceThb: row.listPriceThb ?? row.amountThb,
    discountThb: row.discountThb ?? 0,
  };
}

export async function GET() {
  const auth = await requireApiUser({
    allowIncompleteOnboarding: true,
  });
  if (!auth.ok) return auth.response;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const checkout = await prisma.billingCheckout
    .findFirst({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);

  return NextResponse.json({
    ok: true,
    checkout: checkout ? toDto(checkout) : null,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser({
    allowIncompleteOnboarding: true,
  });
  if (!auth.ok) return auth.response;

  const limited = await rateLimitJson(`billing-checkout:${auth.user.id}`, 8);
  if (limited) return limited;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { plan?: string };
  const parsed = parseCheckoutPlan(body.plan);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "plan" }, { status: 400 });
  }

  const plan = paidPlanFromCheckout(parsed);
  const listPriceThb = amountForPlan(parsed);

  const existing = await prisma.billingCheckout
    .findFirst({
      where: { userId: auth.user.id, plan, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);
  if (existing) {
    return NextResponse.json({ ok: true, checkout: toDto(existing) });
  }

  // A referral discount only ever applies to this account's first (still-unlinked) checkout.
  const referral = await prisma.referral
    .findUnique({ where: { referredUserId: auth.user.id } })
    .catch(() => null);
  const discountThb = referral && !referral.checkoutId ? referral.discountThb : 0;
  const amountThb = Math.max(0, listPriceThb - discountThb);

  const checkout = await prisma.$transaction(async (tx) => {
    const created = await tx.billingCheckout.create({
      data: { userId: auth.user.id, plan, listPriceThb, discountThb, amountThb },
    });
    if (discountThb > 0 && referral) {
      await tx.referral.update({
        where: { id: referral.id },
        data: { checkoutId: created.id },
      });
    }
    return created;
  }).catch(() => null);
  if (!checkout) {
    return NextResponse.json({ ok: false, error: "database" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, checkout: toDto(checkout) });
}
