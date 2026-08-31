import { describe, expect, it } from "vitest";
import { oaKeyFromText } from "./messaging";
import { formatGoalDigest, formatHomeDigest, formatReviewDigest, formatTodoDigest } from "./oa-digest";

describe("oaKeyFromText", () => {
  it("reads rich-menu postbacks and Thai labels", () => {
    expect(oaKeyFromText("mudmai:today")).toBe("today");
    expect(oaKeyFromText("mudmai:goals")).toBe("goals");
    expect(oaKeyFromText("เป้า SMART")).toBe("goals");
    expect(oaKeyFromText("รีวิว")).toBe("reviews");
    expect(oaKeyFromText("หน้าหลัก")).toBe("home");
  });
});

describe("OA digest copy", () => {
  it("lists today's tasks", () => {
    const text = formatTodoDigest("th", "2026-09-01", [
      { title: "เดิน 20 นาที", isCompleted: true },
      { title: "ส่งเมล", isCompleted: false },
    ]);
    expect(text).toContain("วันนี้ · 2026-09-01");
    expect(text).toContain("1/2 งาน");
    expect(text).toContain("✓ เดิน 20 นาที");
    expect(text).toContain("○ ส่งเมล");
  });

  it("summarizes goals, reviews, and home", () => {
    expect(
      formatGoalDigest("th", 2026, [
        { title: "อ่าน 12 เล่ม", quarter: 1, currentValue: 3, targetValue: 12, status: "IN_PROGRESS" },
      ]),
    ).toContain("Q1 · อ่าน 12 เล่ม · 25%");
    expect(formatReviewDigest("th", 2026, 9, 3, false, true)).toContain("เดือน 9: ยังไม่มี");
    expect(formatHomeDigest("th", "2026-09-01", 1, 3, 4, 5)).toContain("อารมณ์วันนี้ 5/5");
  });
});
