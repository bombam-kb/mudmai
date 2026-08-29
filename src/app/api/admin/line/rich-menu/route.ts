import { NextResponse } from "next/server";
import { requireAdminSecret } from "@/lib/auth/require-admin";
import { installRichMenu } from "@/lib/line/rich-menu";

export async function POST(request: Request) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;
  const locale =
    new URL(request.url).searchParams.get("locale") === "en" ? "en" : "th";
  try {
    const richMenuId = await installRichMenu(locale);
    return NextResponse.json({ ok: true, richMenuId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "richmenu";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
