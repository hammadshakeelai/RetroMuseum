import { describe, expect, it } from "vitest";
import { readFrontmatter, setFrontmatterValue } from "./exhibits.ts";

const file = `---
title: TetrOS
screenshotWaitSeconds: 30
v86:
  fda:
    url: https://i.copy.sh/tetros.img
    size: 512
---

The story.
`;

describe("readFrontmatter", () => {
  it("parses nested YAML", () => {
    expect(readFrontmatter(file)).toEqual({
      title: "TetrOS",
      screenshotWaitSeconds: 30,
      v86: { fda: { url: "https://i.copy.sh/tetros.img", size: 512 } },
    });
  });

  it("fails without frontmatter", () => {
    expect(() => readFrontmatter("The story.")).toThrow("Missing frontmatter");
  });
});

describe("setFrontmatterValue", () => {
  it("adds a missing key before the closing line and keeps the body", () => {
    const updated = setFrontmatterValue(file, "downloadEstimateMB", 1);
    expect(readFrontmatter(updated).downloadEstimateMB).toBe(1);
    expect(updated.endsWith("---\n\nThe story.\n")).toBe(true);
  });

  it("replaces an existing top-level key without touching one that only shares its prefix", () => {
    const withScreenshot = setFrontmatterValue(file, "screenshot", "./screenshots/old.png");
    const updated = setFrontmatterValue(withScreenshot, "screenshot", "./screenshots/tetros.png");
    const data = readFrontmatter(updated);
    expect(data.screenshot).toBe("./screenshots/tetros.png");
    expect(data.screenshotWaitSeconds).toBe(30);
  });

  it("doesn't touch nested keys with the same name", () => {
    const updated = setFrontmatterValue(file, "size", 4);
    const data = readFrontmatter(updated) as { size: number; v86: { fda: { size: number } } };
    expect(data.size).toBe(4);
    expect(data.v86.fda.size).toBe(512);
  });

  it("keeps Windows line endings", () => {
    const updated = setFrontmatterValue(file.replaceAll("\n", "\r\n"), "downloadEstimateMB", 1);
    expect(updated.includes("downloadEstimateMB: 1\r\n---\r\n")).toBe(true);
  });
});
