import { describe, expect, it } from "vitest";
import { stepIndex } from "./hall.ts";

describe("stepIndex", () => {
  it("moves forward and back", () => {
    expect(stepIndex(1, 1, 5)).toBe(2);
    expect(stepIndex(1, -1, 5)).toBe(0);
  });

  it("wraps at both ends", () => {
    expect(stepIndex(4, 1, 5)).toBe(0);
    expect(stepIndex(0, -1, 5)).toBe(4);
  });

  it("returns 0 for an empty collection", () => {
    expect(stepIndex(3, 1, 0)).toBe(0);
  });
});
