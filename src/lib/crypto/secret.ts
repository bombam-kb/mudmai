import { createHmac, timingSafeEqual } from "node:crypto";

export function hmacSha256Base64(secret: string, body: string | Buffer) {
  return createHmac("sha256", secret).update(body).digest("base64");
}

export function timingSafeEqualText(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
