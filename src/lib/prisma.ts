import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function hasCurrentModels(client: PrismaClient) {
  return (
    typeof client.dailyMood?.findUnique === "function" &&
    typeof client.monthlyPlan?.findUnique === "function" &&
    typeof client.billingCheckout?.findFirst === "function"
  );
}

function resolvePrisma() {
  const existing = globalForPrisma.prisma;
  if (existing && hasCurrentModels(existing)) return existing;
  if (existing) void existing.$disconnect();
  const client = createPrisma();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = resolvePrisma();
