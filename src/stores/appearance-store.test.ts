import { describe, expect, it } from "vitest";
import { resolveLayout } from "./appearance-store";

describe("resolveLayout", () => {
  it("defaults wide viewports to desktop until the user picks a layout", () => {
    expect(resolveLayout(null, 1280)).toBe("desktop");
    expect(resolveLayout({ layout: "mobile" }, 1280)).toBe("desktop");
    expect(resolveLayout({ layout: "mobile", layoutChosen: false }, 1024)).toBe(
      "desktop",
    );
  });

  it("defaults narrow viewports to mobile until the user picks a layout", () => {
    expect(resolveLayout(undefined, 390)).toBe("mobile");
    expect(resolveLayout({ layout: "desktop", layoutChosen: false }, 390)).toBe(
      "mobile",
    );
  });

  it("honors an explicit layout choice on any viewport", () => {
    expect(
      resolveLayout({ layout: "mobile", layoutChosen: true }, 1440),
    ).toBe("mobile");
    expect(
      resolveLayout({ layout: "desktop", layoutChosen: true }, 390),
    ).toBe("desktop");
  });
});
