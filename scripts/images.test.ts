import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ExhibitFile } from "./exhibits.ts";
import { hostedImages, syncImages, type HostedImage } from "./images.ts";

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const tetrosBytes = new Uint8Array(512).fill(7);
const otherBytes = new Uint8Array(512).fill(9);
const tetros: HostedImage = {
  slug: "tetros",
  file: "tetros.img",
  size: 512,
  from: "https://example.com/tetros.img",
  sha256: sha256(tetrosBytes),
};
const log = () => {};

function server(files: Record<string, Uint8Array<ArrayBuffer>>) {
  const requested: string[] = [];
  const fetcher = async (url: string) => {
    requested.push(url);
    const body = files[url];
    return body ? new Response(body) : new Response(null, { status: 404 });
  };
  return { fetcher, requested };
}

const tempDir = () => mkdtemp(join(tmpdir(), "images-"));
const exhibit = (slug: string, data: Record<string, unknown>): ExhibitFile => ({ slug, path: `${slug}.md`, data });

describe("hostedImages", () => {
  it("lists each hosted exhibit's disk file, size, origin and hash, and skips copy.sh exhibits", () => {
    const helenos = exhibit("helenos", {
      diskImage: { from: "https://www.helenos.org/releases/HelenOS-0.14.1-ia32.iso", sha256: "a".repeat(64), license: "BSD" },
      v86: { memory_size: 268435456, cdrom: { url: "HelenOS-0.14.1-ia32.iso", size: 25792512, async: false } },
    });
    expect(hostedImages([helenos, exhibit("windows95", { copyShProfile: "windows95" })])).toEqual([
      {
        slug: "helenos",
        file: "HelenOS-0.14.1-ia32.iso",
        size: 25792512,
        from: "https://www.helenos.org/releases/HelenOS-0.14.1-ia32.iso",
        sha256: "a".repeat(64),
      },
    ]);
  });

  it("names a hosted exhibit whose disk has no size", () => {
    const broken = exhibit("tetros", {
      diskImage: { from: tetros.from, sha256: tetros.sha256, license: "MIT" },
      v86: { fda: { url: "tetros.img" } },
    });
    expect(() => hostedImages([broken])).toThrow("tetros");
  });
});

describe("syncImages", () => {
  it("downloads a missing image", async () => {
    const dir = await tempDir();
    const { fetcher } = server({ [tetros.from]: tetrosBytes });
    await syncImages([tetros], dir, { fetcher, log });
    expect(new Uint8Array(await readFile(join(dir, "tetros.img")))).toEqual(tetrosBytes);
  });

  it("keeps an image whose hash already matches, without requesting it", async () => {
    const dir = await tempDir();
    await writeFile(join(dir, "tetros.img"), tetrosBytes);
    const { fetcher, requested } = server({});
    await syncImages([tetros], dir, { fetcher, log });
    expect(requested).toEqual([]);
  });

  it("replaces an image whose hash doesn't match", async () => {
    const dir = await tempDir();
    await writeFile(join(dir, "tetros.img"), otherBytes);
    const { fetcher } = server({ [tetros.from]: tetrosBytes });
    await syncImages([tetros], dir, { fetcher, log });
    expect(new Uint8Array(await readFile(join(dir, "tetros.img")))).toEqual(tetrosBytes);
  });

  it("rejects a download with the wrong hash, naming both hashes, and leaves no file behind", async () => {
    const dir = await tempDir();
    const { fetcher } = server({ [tetros.from]: otherBytes });
    await expect(syncImages([tetros], dir, { fetcher, log })).rejects.toThrow(new RegExp(`${sha256(otherBytes)}.*${tetros.sha256}`));
    expect(await readdir(dir)).toEqual([]);
  });

  it("rejects a download of the wrong size", async () => {
    const dir = await tempDir();
    const { fetcher } = server({ [tetros.from]: new Uint8Array(1024) });
    await expect(syncImages([tetros], dir, { fetcher, log })).rejects.toThrow("1024 bytes, expected 512");
    expect(await readdir(dir)).toEqual([]);
  });

  it("rejects an HTTP error, naming the status", async () => {
    const dir = await tempDir();
    const { fetcher } = server({});
    await expect(syncImages([tetros], dir, { fetcher, log })).rejects.toThrow("HTTP 404");
  });

  it("deletes files that no exhibit lists", async () => {
    const dir = await tempDir();
    await writeFile(join(dir, "tetros.img"), tetrosBytes);
    await writeFile(join(dir, "retired.img"), otherBytes);
    await writeFile(join(dir, "kolibri.img.part"), otherBytes);
    const { fetcher } = server({});
    await syncImages([tetros], dir, { fetcher, log });
    expect(await readdir(dir)).toEqual(["tetros.img"]);
  });

  it("refuses, before downloading, when the images total more than the limit", async () => {
    const dir = await tempDir();
    const { fetcher, requested } = server({ [tetros.from]: tetrosBytes });
    const big = { ...tetros, slug: "big", file: "big.img", size: 1024, from: "https://example.com/big.img" };
    await expect(syncImages([tetros, big], dir, { fetcher, log, maxTotalBytes: 1000 })).rejects.toThrow("over the limit");
    expect(requested).toEqual([]);
  });

  it("refuses an image over 100 MB", async () => {
    const dir = await tempDir();
    const { fetcher, requested } = server({});
    const huge = { ...tetros, slug: "huge", file: "huge.iso", size: 101 * 1024 * 1024 };
    await expect(syncImages([huge], dir, { fetcher, log })).rejects.toThrow("huge: huge.iso is 101 MB, over the 100 MB limit");
    expect(requested).toEqual([]);
  });
});
