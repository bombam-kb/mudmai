import { deflateSync } from "node:zlib";
import { OA_PAGES, pagePostback } from "@/lib/line/messaging";
import { isLineMessagingConfigured } from "@/lib/env";

const WIDTH = 2500;
const HEIGHT = 843;
const COL = 625;
const MENU_NAME = "mudmai-shortcuts";

const COLORS: Array<[number, number, number]> = [
  [37, 99, 235],
  [139, 92, 246],
  [16, 185, 129],
  [6, 182, 212],
];

/** 5x7 uppercase glyphs for the rich-menu PNG (LINE requires an image). */
const GLYPHS: Record<string, number[]> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b11111],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  " ": [0, 0, 0, 0, 0, 0, 0],
};

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

function setPixel(
  raw: Buffer,
  stride: number,
  x: number,
  y: number,
  rgb: [number, number, number],
) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  const i = y * stride + 1 + x * 3;
  raw[i] = rgb[0];
  raw[i + 1] = rgb[1];
  raw[i + 2] = rgb[2];
}

function drawText(
  raw: Buffer,
  stride: number,
  text: string,
  left: number,
  top: number,
  scale: number,
  rgb: [number, number, number],
) {
  let x = left;
  for (const char of text.toUpperCase()) {
    const glyph = GLYPHS[char] ?? GLYPHS[" "];
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (((glyph[gy] >> (4 - gx)) & 1) === 0) continue;
        for (let py = 0; py < scale; py++) {
          for (let px = 0; px < scale; px++) {
            setPixel(raw, stride, x + gx * scale + px, top + gy * scale + py, rgb);
          }
        }
      }
    }
    x += 6 * scale;
  }
}

function textWidth(text: string, scale: number) {
  return text.length * 6 * scale - scale;
}

/** Compact rich-menu PNG: four labeled columns (Today / Goals / Review / Home). */
export function richMenuPng() {
  const stride = 1 + WIDTH * 3;
  const raw = Buffer.alloc(stride * HEIGHT);
  const labels = ["TODAY", "GOALS", "REVIEW", "HOME"];
  for (let y = 0; y < HEIGHT; y++) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < WIDTH; x++) {
      const col = Math.min(3, Math.floor(x / COL));
      const [r, g, b] = COLORS[col];
      const i = row + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const scale = 8;
  for (let col = 0; col < 4; col++) {
    const label = labels[col];
    const width = textWidth(label, scale);
    const left = col * COL + Math.floor((COL - width) / 2);
    const top = Math.floor((HEIGHT - 7 * scale) / 2);
    drawText(raw, stride, label, left, top, scale, [255, 255, 255]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function authHeaders() {
  return { Authorization: `Bearer ${process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN}` };
}

function areas(locale: "th" | "en") {
  return OA_PAGES.map((page, index) => {
    const action = pagePostback(locale, page.key);
    return {
      bounds: { x: index * COL, y: 0, width: COL, height: HEIGHT },
      action: { type: "postback" as const, data: action.data, displayText: action.displayText },
    };
  });
}

export async function installRichMenu(locale: "th" | "en" = "th") {
  if (!isLineMessagingConfigured()) {
    throw new Error("messaging_unconfigured");
  }
  const auth = authHeaders();
  const created = await fetch("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      size: { width: WIDTH, height: HEIGHT },
      selected: true,
      name: MENU_NAME,
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
  await deleteOtherMenus(richMenuId);
  cachedMenuId = richMenuId;
  return richMenuId;
}

let cachedMenuId: string | null = null;

async function deleteOtherMenus(keepId: string) {
  const listed = await fetch("https://api.line.me/v2/bot/richmenu/list", { headers: authHeaders() });
  if (!listed.ok) return;
  const json = (await listed.json()) as { richmenus?: Array<{ richMenuId: string }> };
  await Promise.all(
    (json.richmenus ?? [])
      .filter((item) => item.richMenuId !== keepId)
      .map((item) =>
        fetch(`https://api.line.me/v2/bot/richmenu/${item.richMenuId}`, {
          method: "DELETE",
          headers: authHeaders(),
        }),
      ),
  );
}

export async function ensureDefaultRichMenu(locale: "th" | "en" = "th") {
  if (!isLineMessagingConfigured()) return null;
  if (cachedMenuId) return cachedMenuId;
  const current = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
    headers: authHeaders(),
  });
  if (current.ok) {
    const json = (await current.json()) as { richMenuId?: string };
    if (json.richMenuId) {
      cachedMenuId = json.richMenuId;
      return json.richMenuId;
    }
  }
  return installRichMenu(locale);
}

export async function assignRichMenu(lineUserId: string, richMenuId: string) {
  if (!isLineMessagingConfigured()) return;
  await fetch(`https://api.line.me/v2/bot/user/${lineUserId}/richmenu/${richMenuId}`, {
    method: "POST",
    headers: authHeaders(),
  });
}

export async function attachUserMenu(lineUserId: string, locale: "th" | "en" = "th") {
  const menuId = await ensureDefaultRichMenu(locale);
  if (menuId) await assignRichMenu(lineUserId, menuId);
}
