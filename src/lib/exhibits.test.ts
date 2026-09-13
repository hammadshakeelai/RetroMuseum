import { describe, expect, it } from "vitest";
import { byYear, COPYRIGHT_LABEL, copyShLine, copyShUrl, downloadLine, exhibitKindIssue } from "./exhibits.ts";

describe("exhibit text", () => {
  it("uses the spec's copyright label", () => {
    expect(COPYRIGHT_LABEL).toBe(
      "Copyrighted software, shown for its history. It runs on copy.sh, the v86 project's site; RetroMuseum doesn't host it.",
    );
  });

  it("describes the download", () => {
    expect(downloadLine(40)).toBe("Downloads as it runs, about 40 MB to reach the desktop.");
  });

  it("describes opening an exhibit on copy.sh", () => {
    expect(copyShLine(40)).toBe("Opens on copy.sh, the v86 project's site, and downloads about 40 MB as it runs.");
  });

  it("links to a v86 profile on copy.sh", () => {
    expect(copyShUrl("windows95")).toBe("https://copy.sh/v86/?profile=windows95");
  });

  it("sorts by year, then title", () => {
    const sorted = [
      { year: 1995, title: "Windows 95" },
      { year: 1985, title: "Windows 1.01" },
      { year: 1995, title: "BeOS" },
    ].sort(byYear);
    expect(sorted.map((exhibit) => exhibit.title)).toEqual(["Windows 1.01", "BeOS", "Windows 95"]);
  });
});

describe("exhibitKindIssue", () => {
  const v86 = { fda: { url: "tetros.img", size: 512 } };
  const diskImage = { from: "https://example.com/tetros.img", sha256: "0".repeat(64), license: "MIT" };

  it("accepts a hosted exhibit and a copy.sh exhibit", () => {
    expect(exhibitKindIssue({ v86, diskImage })).toBeNull();
    expect(exhibitKindIssue({ copyShProfile: "windows95" })).toBeNull();
  });

  it("rejects both kinds at once, neither, and half of a hosted exhibit", () => {
    for (const data of [{ v86, diskImage, copyShProfile: "tetros" }, {}, { v86 }, { diskImage }]) {
      expect(exhibitKindIssue(data)).toMatch(/diskImage and v86.*copyShProfile/);
    }
  });
});
