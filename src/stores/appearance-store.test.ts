import { describe, expect, it } from "vitest";
import { layoutFromWidth } from "./appearance-store";

describe("layoutFromWidth", () => {
  it("uses desktop UI from the md breakpoint up", () => {
    expect(layoutFromWidth(768)).toBe("desktop");
    expect(layoutFromWidth(1280)).toBe("desktop");
  });

  it("uses mobile UI below the md breakpoint", () => {
    expect(layoutFromWidth(767)).toBe("mobile");
    expect(layoutFromWidth(390)).toBe("mobile");
  });
});
