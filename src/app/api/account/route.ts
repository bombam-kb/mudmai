import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, rateLimitResponse } from "@/lib/http/rate-limit";
import { deleteVisionStorageForUser } from "@/lib/vision/storage";

function isMissingRecord(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

export async function DELETE() {
  const auth = await requireApiUser({
    allowMissingPdpa: true,
    allowIncompleteOnboarding: true,
  });
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const limited = await consumeRateLimit(`account-delete:${user.id}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    const { status, headers } = rateLimitResponse(limited.retryAfterMs);
    return NextResponse.json({ ok: false, reason: "rate" }, { status, headers });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "auth-admin" }, { status: 503 });
  }

  await deleteVisionStorageForUser(admin, user.id);

  if (process.env.DATABASE_URL) {
    try {
      await prisma.user.delete({ where: { id: user.id } });
    } catch (error) {
      if (!isMissingRecord(error)) {
        console.error("account delete db", error);
        return NextResponse.json({ ok: false, error: "database" }, { status: 500 });
      }
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error && !/not found|already/i.test(error.message)) {
    console.error("account delete auth", error);
    return NextResponse.json({ ok: false, error: "auth" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
