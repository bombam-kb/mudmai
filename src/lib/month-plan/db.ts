import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { type MonthPlanDto } from "@/lib/month-plan/schema";

export type MonthPlanRow = {
  year: number;
  month: number;
  importantNote: string;
  goals: unknown;
};

function hasDelegate() {
  return typeof prisma.monthlyPlan?.findUnique === "function";
}

export async function findMonthPlan(
  userId: string,
  year: number,
  month: number,
): Promise<MonthPlanRow | null> {
  if (hasDelegate()) {
    const row = await prisma.monthlyPlan
      .findUnique({
        where: { userId_year_month: { userId, year, month } },
      })
      .catch(() => null);
    if (row) return row;
  }

  const rows = await prisma
    .$queryRaw<MonthPlanRow[]>`
      SELECT year, month, "importantNote", goals
      FROM "MonthlyPlan"
      WHERE "userId" = ${userId}::uuid AND year = ${year} AND month = ${month}
      LIMIT 1
    `
    .catch(() => [] as MonthPlanRow[]);
  return rows[0] ?? null;
}

export async function listMonthPlans(
  userId: string,
  year: number,
): Promise<MonthPlanRow[]> {
  if (hasDelegate()) {
    const rows = await prisma.monthlyPlan
      .findMany({
        where: { userId, year },
        orderBy: { month: "asc" },
      })
      .catch(() => null);
    if (rows) return rows;
  }

  return prisma
    .$queryRaw<MonthPlanRow[]>`
      SELECT year, month, "importantNote", goals
      FROM "MonthlyPlan"
      WHERE "userId" = ${userId}::uuid AND year = ${year}
      ORDER BY month ASC
    `
    .catch(() => [] as MonthPlanRow[]);
}

export async function saveMonthPlan(
  userId: string,
  data: MonthPlanDto,
): Promise<MonthPlanRow> {
  const goalsJson = data.goals as Prisma.InputJsonValue;
  if (hasDelegate()) {
    try {
      return await prisma.monthlyPlan.upsert({
        where: {
          userId_year_month: {
            userId,
            year: data.year,
            month: data.month,
          },
        },
        create: {
          userId,
          year: data.year,
          month: data.month,
          importantNote: data.importantNote,
          goals: goalsJson,
        },
        update: {
          importantNote: data.importantNote,
          goals: goalsJson,
        },
      });
    } catch (error) {
      console.error("monthlyPlan.upsert", error);
    }
  }

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "MonthlyPlan" ("id", "userId", "year", "month", "importantNote", "goals", "createdAt", "updatedAt")
      VALUES (
        ${crypto.randomUUID()}::uuid,
        ${userId}::uuid,
        ${data.year},
        ${data.month},
        ${data.importantNote},
        CAST(${JSON.stringify(data.goals)} AS JSONB),
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId", "year", "month")
      DO UPDATE SET
        "importantNote" = EXCLUDED."importantNote",
        "goals" = EXCLUDED."goals",
        "updatedAt" = NOW()
    `,
  );
  return data;
}
