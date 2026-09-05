import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  emptyMonthPlan,
  toMonthPlanDto,
  type MemoryImageMeta,
  type MonthPlanDto,
} from "@/lib/month-plan/schema";

export type MonthPlanRow = {
  year: number;
  month: number;
  importantNote: string;
  goals: unknown;
  memoryImageUrl?: string | null;
  memoryCaption?: string | null;
  memoryImageMeta?: unknown;
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
      SELECT year, month, "importantNote", goals, "memoryImageUrl", "memoryCaption", "memoryImageMeta"
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
      SELECT year, month, "importantNote", goals, "memoryImageUrl", "memoryCaption", "memoryImageMeta"
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
          memoryImageUrl: data.memoryImageUrl,
          memoryCaption: data.memoryCaption,
          memoryImageMeta: data.memoryImageMeta as Prisma.InputJsonValue,
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
      INSERT INTO "MonthlyPlan" ("id", "userId", "year", "month", "importantNote", "goals", "memoryImageUrl", "memoryCaption", "memoryImageMeta", "createdAt", "updatedAt")
      VALUES (
        ${crypto.randomUUID()}::uuid,
        ${userId}::uuid,
        ${data.year},
        ${data.month},
        ${data.importantNote},
        CAST(${JSON.stringify(data.goals)} AS JSONB),
        ${data.memoryImageUrl},
        ${data.memoryCaption},
        CAST(${JSON.stringify(data.memoryImageMeta)} AS JSONB),
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

export async function patchMonthMemory(
  userId: string,
  year: number,
  month: number,
  patch: {
    memoryImageUrl?: string | null;
    memoryCaption?: string;
    memoryImageMeta?: MemoryImageMeta;
  },
): Promise<MonthPlanDto> {
  const existing = (await findMonthPlan(userId, year, month)) ?? null;
  const base = existing ? toMonthPlanDto(existing) : emptyMonthPlan(year, month);
  const next: MonthPlanDto = {
    ...base,
    memoryImageUrl:
      patch.memoryImageUrl !== undefined ? patch.memoryImageUrl : base.memoryImageUrl,
    memoryCaption:
      patch.memoryCaption !== undefined ? patch.memoryCaption : base.memoryCaption,
    memoryImageMeta:
      patch.memoryImageMeta !== undefined ? patch.memoryImageMeta : base.memoryImageMeta,
  };

  if (hasDelegate()) {
    const row = await prisma.monthlyPlan.upsert({
      where: { userId_year_month: { userId, year, month } },
      create: {
        userId,
        year,
        month,
        importantNote: next.importantNote,
        goals: next.goals as Prisma.InputJsonValue,
        memoryImageUrl: next.memoryImageUrl,
        memoryCaption: next.memoryCaption,
        memoryImageMeta: next.memoryImageMeta as Prisma.InputJsonValue,
      },
      update: {
        memoryImageUrl: next.memoryImageUrl,
        memoryCaption: next.memoryCaption,
        memoryImageMeta: next.memoryImageMeta as Prisma.InputJsonValue,
      },
    });
    return toMonthPlanDto(row);
  }

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "MonthlyPlan" ("id", "userId", "year", "month", "importantNote", "goals", "memoryImageUrl", "memoryCaption", "memoryImageMeta", "createdAt", "updatedAt")
      VALUES (
        ${crypto.randomUUID()}::uuid,
        ${userId}::uuid,
        ${year},
        ${month},
        ${next.importantNote},
        CAST(${JSON.stringify(next.goals)} AS JSONB),
        ${next.memoryImageUrl},
        ${next.memoryCaption},
        CAST(${JSON.stringify(next.memoryImageMeta)} AS JSONB),
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId", "year", "month")
      DO UPDATE SET
        "memoryImageUrl" = EXCLUDED."memoryImageUrl",
        "memoryCaption" = EXCLUDED."memoryCaption",
        "memoryImageMeta" = EXCLUDED."memoryImageMeta",
        "updatedAt" = NOW()
    `,
  );
  return next;
}
