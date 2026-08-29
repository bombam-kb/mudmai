import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/auth/require-admin";
import { dispatchDueReminders } from "@/lib/reminders/dispatch";

async function run(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;
  const result = await dispatchDueReminders();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
