import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PREFS,
  mergePrefs,
  parseMasterEnabled,
  parsePrefPatch,
  toPrefDto,
} from "@/lib/reminders/schema";
import { rateLimitJson } from "@/lib/http/rate-limit";

async function ensurePrefs(userId: string) {
  const existing = await prisma.reminderPreference.findMany({
    where: { userId },
  });
  if (existing.length >= 4) return existing;
  await prisma.reminderPreference.createMany({
    data: DEFAULT_PREFS.filter(
      (pref) => !existing.some((row) => row.cadence === pref.cadence),
    ).map((pref) => ({
      userId,
      cadence: pref.cadence,
      enabled: pref.enabled,
      hour: pref.hour,
      minute: pref.minute,
      weekday: pref.weekday,
      channel: pref.channel,
    })),
    skipDuplicates: true,
  });
  return prisma.reminderPreference.findMany({ where: { userId } });
}

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const rows = await ensurePrefs(user.id);
  return NextResponse.json({
    ok: true,
    prefs: mergePrefs(rows.map(toPrefDto)),
  });
}

export async function PUT(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const limited = await rateLimitJson(`reminders-write:${user.id}`, 60);
  if (limited) return limited;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "database" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const master = parseMasterEnabled(body);
  await ensurePrefs(user.id);

  if (master.ok) {
    await prisma.reminderPreference.updateMany({
      where: { userId: user.id },
      data: { enabled: master.enabled },
    });
    const rows = await prisma.reminderPreference.findMany({ where: { userId: user.id } });
    return NextResponse.json({
      ok: true,
      prefs: mergePrefs(rows.map(toPrefDto)),
      enabled: master.enabled,
    });
  }

  const parsed = parsePrefPatch(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  await ensurePrefs(user.id);
  const pref = await prisma.reminderPreference.upsert({
    where: {
      userId_cadence: { userId: user.id, cadence: parsed.data.cadence },
    },
    create: {
      userId: user.id,
      cadence: parsed.data.cadence,
      enabled: parsed.data.enabled,
      hour: parsed.data.hour,
      minute: parsed.data.minute,
      weekday: parsed.data.weekday,
      channel: parsed.data.channel,
    },
    update: {
      enabled: parsed.data.enabled,
      hour: parsed.data.hour,
      minute: parsed.data.minute,
      weekday: parsed.data.weekday,
      channel: parsed.data.channel,
    },
  });

  return NextResponse.json({ ok: true, pref: toPrefDto(pref) });
}
