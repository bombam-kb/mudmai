import { describe, expect, it } from "vitest";
import { shouldPushLine } from "./channel";

const ready = {
  configured: true,
  reachable: true,
  optIn: true,
  lineUserId: "U123",
};

describe("shouldPushLine", () => {
  it("sends LINE when opted in and the OA can deliver", () => {
    expect(shouldPushLine(ready)).toBe(true);
  });

  it("does not send when the user turned LINE reminders off or is unreachable", () => {
    expect(shouldPushLine({ ...ready, optIn: false })).toBe(false);
    expect(shouldPushLine({ ...ready, reachable: false })).toBe(false);
    expect(shouldPushLine({ ...ready, lineUserId: null })).toBe(false);
  });
});
