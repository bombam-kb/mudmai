import { hmacSha256Base64, timingSafeEqualText } from "@/lib/crypto/secret";

/** LINE Messaging API webhook: HMAC-SHA256(body, channel secret) as Base64. */
export function lineWebhookSignature(channelSecret: string, rawBody: string | Buffer) {
  return hmacSha256Base64(channelSecret, rawBody);
}

export function verifyLineWebhookSignature(
  channelSecret: string,
  rawBody: string | Buffer,
  header: string | null,
) {
  if (!header) return false;
  return timingSafeEqualText(lineWebhookSignature(channelSecret, rawBody), header);
}
