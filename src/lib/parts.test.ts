import { describe, expect, it } from "vitest";
import { exhibitUrls, firstRequestUrl } from "./parts.ts";

describe("firstRequestUrl", () => {
  it("returns the URL of a whole image", () => {
    expect(firstRequestUrl({ url: "https://i.copy.sh/tetros.img" })).toBe("https://i.copy.sh/tetros.img");
  });

  it("names the first part of a split image in a folder", () => {
    expect(firstRequestUrl({ url: "https://i.copy.sh/windows95-v3/.img", use_parts: true, fixed_chunk_size: 262144 })).toBe(
      "https://i.copy.sh/windows95-v3/0-262144.img",
    );
  });

  it("keeps a .zst double extension", () => {
    expect(firstRequestUrl({ url: "https://i.copy.sh/serenity-v3/.img.zst", use_parts: true, fixed_chunk_size: 1048576 })).toBe(
      "https://i.copy.sh/serenity-v3/0-1048576.img.zst",
    );
  });

  it("adds a dash when the base name isn't a folder", () => {
    expect(firstRequestUrl({ url: "https://example.com/disk.img", use_parts: true, fixed_chunk_size: 1024 })).toBe(
      "https://example.com/disk-0-1024.img",
    );
  });
});

describe("exhibitUrls", () => {
  it("lists each disk's first request, then the snapshot", () => {
    expect(
      exhibitUrls({
        hda: { url: "https://i.copy.sh/haiku-v5/.img", size: 1342177280, async: true, fixed_chunk_size: 1048576, use_parts: true },
        initial_state: { url: "https://i.copy.sh/haiku_state-v5.bin.zst" },
      }),
    ).toEqual(["https://i.copy.sh/haiku-v5/0-1048576.img", "https://i.copy.sh/haiku_state-v5.bin.zst"]);
  });
});
