import { deflateSync } from "node:zlib";
import { lineAppHref } from "@/lib/line/messaging";
import { isLineMessagingConfigured } from "@/lib/env";

const WIDTH = 2500;
const HEIGHT = 843;
const COL = 625;

const COLORS: Array<[number, number, number]> = [
  [37, 99, 235],
  [139, 92, 246],
  [16, 185, 129],
  [6, 182, 212],
];

function crc32(buf: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Compact rich-menu PNG: four pillar-colored columns (no secrets in the image). */
export function richMenuPng() {
  const stride = 1 + WIDTH * 3;
  const raw = Buffer.alloc(stride * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < WIDTH; x++) {
      const [r, g, b] = COLORS[Math.min(3, Math.floor(x / COL))];
      const i = row + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

function areas(locale: "th" | "en") {
  const labels = [
    { path: "/todos", x: 0 },
    { path: "/goals", x: COL },
    { path: "/reviews", x: COL * 2 },
    { path: "/home", x: COL * 3 },
  ];
  return labels.map((item) => ({
    bounds: { x: item.x, y: 0, width: COL, height: HEIGHT },
    action: { type: "uri" as const, uri: lineAppHref(locale, item.path) },
  }));
}

export async function installRichMenu(locale: "th" | "en" = "th") {
  if (!isLineMessagingConfigured()) {
    throw new Error("messaging_unconfigured");
  }
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN!;
  const auth = { Authorization: `Bearer ${token}` };
  const created = await fetch("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      size: { width: WIDTH, height: HEIGHT },
      selected: true,
      name: "mudmai-shortcuts",
      chatBarText: locale === "en" ? "Menu" : "เมนู",
      areas: areas(locale),
    }),
  });
  if (!created.ok) throw new Error("richmenu_create");
  const { richMenuId } = (await created.json()) as { richMenuId: string };
  const uploaded = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "image/png" },
    body: new Uint8Array(richMenuPng()),
  });
  if (!uploaded.ok) throw new Error("richmenu_image");
  const def = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ richMenuId }),
  });
  if (!def.ok) throw new Error("richmenu_default");
  return richMenuId;
}
