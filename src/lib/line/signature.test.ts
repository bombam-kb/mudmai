import { describe, expect, it } from "vitest";
import { lineWebhookSignature, verifyLineWebhookSignature } from "./signature";
import {
  isLinePlaceholderEmail,
  linePlaceholderEmail,
  parseOAuthState,
  signOAuthState,
  type LineOAuthState,
} from "./oauth";

describe("LINE webhook signature", () => {
  it("accepts the LINE HMAC and rejects a truncated header", () => {
    const secret = "channel-secret";
    const body = "{\"events\":[]}";
    const header = lineWebhookSignature(secret, body);
    expect(verifyLineWebhookSignature(secret, body, header)).toBe(true);
    expect(verifyLineWebhookSignature(secret, body, header.slice(1))).toBe(false);
    expect(verifyLineWebhookSignature(secret, body, null)).toBe(false);
  });
});

describe("LINE placeholder email", () => {
  it("is unique per LINE user and easy to detect", () => {
    const email = linePlaceholderEmail("Uaaa");
    expect(email).toBe("line-uaaa@line.invalid");
    expect(isLinePlaceholderEmail(email)).toBe(true);
    expect(isLinePlaceholderEmail("person@example.com")).toBe(false);
  });
});

describe("LINE OAuth state", () => {
  it("round-trips a signed login payload", () => {
    process.env.LINE_LOGIN_CHANNEL_SECRET = "oauth-secret";
    const state: LineOAuthState = {
      nonce: "abcdefghijkl",
      intent: "login",
      locale: "th",
      next: "/home",
      pdpa: true,
      ref: "ABC",
    };
    const token = signOAuthState(state);
    expect(parseOAuthState(token)).toMatchObject({
      intent: "login",
      locale: "th",
      pdpa: true,
      ref: "ABC",
    });
    expect(parseOAuthState(`${token}x`)).toBeNull();
  });
});
