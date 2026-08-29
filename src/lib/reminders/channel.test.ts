import { describe, expect, it } from "vitest";
import { shouldPushLine } from "./channel";

const ready = {
  channel: "LINE" as const,
  configured: true,
  reachable: true,
  optIn: true,
  lineUserId: "U123",
};

describe("shouldPushLine", () => {
  it("sends LINE only when the cadence is set to LINE and the OA can deliver", () => {
    expect(shouldPushLine(ready)).toBe(true);
  });

  it("does not send LINE for in-app or browser cadences", () => {
    expect(shouldPushLine({ ...ready, channel: "IN_APP" })).toBe(false);
    expect(shouldPushLine({ ...ready, channel: "BROWSER" })).toBe(false);
  });

  it("does not send when the user turned LINE reminders off or is unreachable", () => {
    expect(shouldPushLine({ ...ready, optIn: false })).toBe(false);
    expect(shouldPushLine({ ...ready, reachable: false })).toBe(false);
    expect(shouldPushLine({ ...ready, lineUserId: null })).toBe(false);
  });
});
