import { describe, expect, it } from "vitest";
import { FAMILIES, familiesPresent, familyLabel } from "./families.ts";

describe("families", () => {
  it("lists the five families in display order", () => {
    expect(FAMILIES.map((family) => family.label)).toEqual(["DOS", "Windows", "Unix, BSD & Linux", "Independent", "Boot-sector"]);
  });

  it("labels a family id", () => {
    expect(familyLabel("unix-bsd-linux")).toBe("Unix, BSD & Linux");
  });

  it("keeps only families that have exhibits, in display order", () => {
    expect(familiesPresent(["boot-sector", "dos", "boot-sector"])).toEqual(["dos", "boot-sector"]);
  });
});
