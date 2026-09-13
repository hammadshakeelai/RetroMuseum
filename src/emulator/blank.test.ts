import { describe, expect, it } from "vitest";
import { isBlank } from "./blank.ts";

function pixels(count: number, lit: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < lit; i++) data.set([255, 255, 255, 255], i * 4);
  return data;
}

describe("isBlank", () => {
  it("is blank when every pixel matches", () => {
    expect(isBlank(pixels(10_000, 0))).toBe(true);
  });

  it("isn't blank once a small share of pixels differ", () => {
    expect(isBlank(pixels(10_000, 100))).toBe(false);
  });

  it("treats a lone cursor as blank", () => {
    expect(isBlank(pixels(100_000, 20))).toBe(true);
  });

  it("is blank with no pixels", () => {
    expect(isBlank(new Uint8ClampedArray())).toBe(true);
  });
});
