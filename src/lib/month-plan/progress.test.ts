import { describe, expect, it } from "vitest";
import { monthGoalProgress } from "./progress";

describe("monthGoalProgress", () => {
  it("is 0% when there are no goals", () => {
    expect(monthGoalProgress([])).toEqual({ completed: 0, total: 0, percent: 0 });
  });

  it("is 0% when none are done", () => {
    expect(monthGoalProgress([{ isDone: false }, { isDone: false }])).toEqual({
      completed: 0,
      total: 2,
      percent: 0,
    });
  });

  it("rounds the share of completed monthly goals", () => {
    expect(
      monthGoalProgress([{ isDone: true }, { isDone: false }, { isDone: false }]),
    ).toEqual({ completed: 1, total: 3, percent: 33 });
  });

  it("is 100% when every monthly goal is done", () => {
    expect(monthGoalProgress([{ isDone: true }, { isDone: true }])).toEqual({
      completed: 2,
      total: 2,
      percent: 100,
    });
  });
});
