import { describe, expect, it } from "vitest";
import { fitScale } from "./fit.ts";

describe("fitScale", () => {
  it("scales up to fill the tighter side", () => {
    expect(fitScale({ width: 1440, height: 1000 }, { width: 720, height: 400 })).toBe(2);
  });

  it("scales down and keeps the aspect ratio", () => {
    expect(fitScale({ width: 512, height: 600 }, { width: 1024, height: 768 })).toBe(0.5);
  });

  it("leaves the scale at 1 before anything is drawn", () => {
    expect(fitScale({ width: 800, height: 600 }, { width: 0, height: 0 })).toBe(1);
    expect(fitScale({ width: 0, height: 0 }, { width: 640, height: 480 })).toBe(1);
  });
});
