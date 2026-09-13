import { describe, expect, it } from "vitest";
import { byYear, COPYRIGHT_LABEL, downloadLine } from "./exhibits.ts";

describe("exhibit text", () => {
  it("uses the spec's copyright label", () => {
    expect(COPYRIGHT_LABEL).toBe("Copyrighted software, shown for its history. The disk image loads from copy.sh, the v86 project's server.");
  });

  it("describes the download", () => {
    expect(downloadLine(40)).toBe("Downloads as it runs, about 40 MB to reach the desktop.");
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
