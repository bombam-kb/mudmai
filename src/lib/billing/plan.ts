import { calendarParts } from "@/lib/year";

export const PLAN = {
  yearlyThb: 299,
  founderThb: 499,
  referralCreditThb: 50,
  /** 1 point = 1 THB. Redeeming a free renewal costs the current yearly price in points. */
  pointsPerThb: 1,
  maxFreeRenewalsPerYear: 1,
  free: {
    todosPerDay: 10,
    visionObjects: 200,
    visionBytes: 15 * 1024 * 1024,
  },
} as const;

export function redemptionCostPoints() {
  return PLAN.yearlyThb * PLAN.pointsPerThb;
}

export type PaidPlan = "FOUNDER" | "YEARLY";
export type CheckoutPlanId = "founder" | "yearly";

export function isPaidPlan(plan?: string | null) {
  return plan === "FOUNDER" || plan === "YEARLY";
}

export function parseCheckoutPlan(value?: string | null): CheckoutPlanId | null {
  if (value === "founder" || value === "yearly") return value;
  if (value === "FOUNDER") return "founder";
  if (value === "YEARLY") return "yearly";
  return null;
}

export function paidPlanFromCheckout(id: CheckoutPlanId): PaidPlan {
  return id === "founder" ? "FOUNDER" : "YEARLY";
}

export function amountForPlan(id: CheckoutPlanId) {
  return id === "founder" ? PLAN.founderThb : PLAN.yearlyThb;
}

export function accountFirstYear(createdAt: Date) {
  return calendarParts(createdAt).year;
}

/** Unpaid accounts get the signup calendar year in full. The next year needs a subscription. */
export function canWriteInYear(input: {
  createdAt: Date;
  paid?: boolean;
  year: number;
}) {
  if (input.paid) return true;
  return input.year <= accountFirstYear(input.createdAt);
}

export function yearFromYmd(ymd: string) {
  return Number(ymd.slice(0, 4));
}

export function formatMb(bytes: number) {
  return (Math.round((bytes / (1024 * 1024)) * 10) / 10).toFixed(1);
}

export function formatMbLimit(used: number, limit = PLAN.free.visionBytes) {
  return `${formatMb(used)}/${formatMb(limit)} MB`;
}
