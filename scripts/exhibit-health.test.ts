import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkExhibits, checkImageUrl, MAIN_JS_URL, profileIds, type Fetcher } from "./exhibit-health.ts";

const partial = (total: number) => new Response(null, { status: 206, headers: { "content-range": `bytes 0-0/${total}` } });
const whole = (length: number) => new Response(null, { status: 200, headers: { "content-length": String(length) } });

describe("checkImageUrl", () => {
  it("asks for one byte, with no Origin or Referer, as the site's own page would", async () => {
    let seen: RequestInit | undefined;
    await checkImageUrl("https://example.com/tetros.img", 512, async (_url, init) => {
      seen = init;
      return partial(512);
    });
    expect(seen?.headers).toEqual({ Range: "bytes=0-0" });
  });

  it("accepts a 206 whose total is the size, or a 200 whose length is the size", async () => {
    expect(await checkImageUrl("https://example.com/tetros.img", 512, async () => partial(512))).toBeNull();
    expect(await checkImageUrl("https://example.com/tetros.img", 512, async () => whole(512))).toBeNull();
  });

  it("reports a failed status, a size mismatch, and a network error", async () => {
    expect(await checkImageUrl("https://example.com/a.img", 512, async () => new Response(null, { status: 404 }))).toBe("HTTP 404");
    expect(await checkImageUrl("https://example.com/a.img", 512, async () => partial(1024))).toBe("1024 bytes, expected 512");
    expect(
      await checkImageUrl("https://example.com/a.img", 512, async () => {
        throw new Error("fetch failed");
      }),
    ).toBe("fetch failed");
  });
});

describe("profileIds", () => {
  it("finds every profile id in v86's profile list", () => {
    const mainJs = 'const oses = [\n  {\n    id: "windows95",\n    name: "Windows 95",\n  },\n  { id: "unix-v7", name: "Unix V7" },\n];';
    expect(profileIds(mainJs)).toEqual(new Set(["windows95", "unix-v7"]));
  });
});

describe("checkExhibits", () => {
  async function collection() {
    const dir = await mkdtemp(join(tmpdir(), "exhibits-"));
    await writeFile(
      join(dir, "tetros.md"),
      "---\ntitle: TetrOS\ndiskImage:\n  from: https://example.com/tetros.img\n  sha256: x\n  license: MIT\nv86:\n  fda:\n    url: tetros.img\n    size: 512\n---\n",
    );
    await writeFile(join(dir, "windows95.md"), "---\ntitle: Windows 95\ncopyShProfile: windows95\n---\n");
    await writeFile(join(dir, "beos.md"), "---\ntitle: BeOS\ncopyShProfile: beos\n---\n");
    return dir;
  }

  it("checks hosted images at their origin and on the site, and copy.sh profiles once against v86's list", async () => {
    const dir = await collection();
    const requested: string[] = [];
    const fetcher: Fetcher = async (url) => {
      requested.push(url);
      if (url === MAIN_JS_URL) return new Response('{ id: "windows95" }');
      if (url.startsWith("https://site.example/")) return new Response(null, { status: 404 });
      return partial(512);
    };
    const problems = await checkExhibits(dir, "https://site.example/RetroMuseum/", fetcher);
    expect(requested.filter((url) => url === MAIN_JS_URL)).toHaveLength(1);
    expect(requested).toContain("https://example.com/tetros.img");
    expect(requested).toContain("https://site.example/RetroMuseum/images/tetros.img");
    expect(problems).toEqual([
      '- **beos**: v86 has no profile "beos"',
      "- **tetros**: site https://site.example/RetroMuseum/images/tetros.img (HTTP 404)",
    ]);
  });

  it("reports an origin problem, and a profile list that doesn't load", async () => {
    const dir = await collection();
    const fetcher: Fetcher = async (url) => {
      if (url === MAIN_JS_URL) return new Response(null, { status: 500 });
      if (url === "https://example.com/tetros.img") return new Response(null, { status: 410 });
      return partial(512);
    };
    expect(await checkExhibits(dir, "https://site.example/RetroMuseum/", fetcher)).toEqual([
      "- v86's profile list didn't load (HTTP 500)",
      "- **tetros**: origin https://example.com/tetros.img (HTTP 410)",
    ]);
  });
});
