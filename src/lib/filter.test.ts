import { describe, expect, it } from "vitest";
import { matchesFilter } from "./filter.ts";

describe("matchesFilter", () => {
  it("shows everything for All", () => {
    expect(matchesFilter("dos", "all")).toBe(true);
  });

  it("shows only the chosen family", () => {
    expect(matchesFilter("dos", "dos")).toBe(true);
    expect(matchesFilter("windows", "dos")).toBe(false);
  });
});
