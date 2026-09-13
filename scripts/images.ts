// Downloads each hosted exhibit's disk image into public/images/ and checks its size and SHA-256
// (spec section 9). Files no exhibit lists are deleted. Usage: npm run images
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readExhibits, type ExhibitFile } from "./exhibits.ts";

export interface HostedImage {
  slug: string;
  file: string;
  size: number;
  from: string;
  sha256: string;
}

export type Fetcher = (url: string) => Promise<Response>;

/** GitHub Pages sites are limited to 1 GB; the spec keeps hosted images under half that. */
export const MAX_TOTAL_BYTES = 500 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 100 * 1024 * 1024;

const megabytes = (bytes: number) => Math.round(bytes / (1024 * 1024));
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

interface RawDisk {
  url?: unknown;
  size?: unknown;
}

export function hostedImages(exhibits: ExhibitFile[]): HostedImage[] {
  return exhibits.flatMap((exhibit) => {
    const image = exhibit.data.diskImage as { from?: unknown; sha256?: unknown } | undefined;
    const v86 = exhibit.data.v86 as Record<string, RawDisk | undefined> | undefined;
    if (!image || !v86) return [];
    const disk = v86.fda ?? v86.hda ?? v86.cdrom;
    if (typeof disk?.url !== "string" || typeof disk.size !== "number" || typeof image.from !== "string" || typeof image.sha256 !== "string") {
      throw new Error(`${exhibit.slug}: a hosted exhibit needs diskImage.from, diskImage.sha256, and a v86 disk with url and size`);
    }
    return [{ slug: exhibit.slug, file: disk.url, size: disk.size, from: image.from, sha256: image.sha256 }];
  });
}

async function alreadyThere(path: string, image: HostedImage): Promise<boolean> {
  try {
    if ((await stat(path)).size !== image.size) return false;
    return sha256(await readFile(path)) === image.sha256;
  } catch {
    return false;
  }
}

async function download(image: HostedImage, dir: string, fetcher: Fetcher): Promise<void> {
  const where = `${image.file} from ${image.from}`;
  const response = await fetcher(image.from);
  if (!response.ok) throw new Error(`${where}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length !== image.size) throw new Error(`${where}: ${bytes.length} bytes, expected ${image.size}`);
  const actual = sha256(bytes);
  if (actual !== image.sha256) throw new Error(`${where}: SHA-256 is ${actual}, expected ${image.sha256}`);
  const part = join(dir, `${image.file}.part`);
  try {
    await writeFile(part, bytes);
    await rename(part, join(dir, image.file));
  } finally {
    await rm(part, { force: true });
  }
}

export async function syncImages(
  images: HostedImage[],
  dir: string,
  options: { fetcher?: Fetcher; maxTotalBytes?: number; log?: (line: string) => void } = {},
): Promise<void> {
  const { fetcher = fetch, maxTotalBytes = MAX_TOTAL_BYTES, log = console.log } = options;
  const total = images.reduce((sum, image) => sum + image.size, 0);
  if (total > maxTotalBytes) throw new Error(`Hosted images total ${total} bytes, over the limit of ${maxTotalBytes} bytes`);
  const tooBig = images.find((image) => image.size > MAX_IMAGE_BYTES);
  if (tooBig) throw new Error(`${tooBig.slug}: ${tooBig.file} is ${megabytes(tooBig.size)} MB, over the 100 MB limit for a hosted image`);
  const files = new Set(images.map((image) => image.file));
  if (files.size !== images.length) throw new Error("Two hosted exhibits use the same image file name");

  await mkdir(dir, { recursive: true });
  for (const name of await readdir(dir)) {
    if (!files.has(name)) await rm(join(dir, name), { recursive: true, force: true });
  }
  for (const image of images) {
    const path = join(dir, image.file);
    if (await alreadyThere(path, image)) continue;
    await rm(path, { force: true });
    log(`Downloading ${image.file} (${megabytes(image.size)} MB) from ${image.from}`);
    await download(image, dir, fetcher);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
  const images = hostedImages(await readExhibits(root("src/content/exhibits")));
  await syncImages(images, root("public/images"));
  const total = images.reduce((sum, image) => sum + image.size, 0);
  console.log(`${images.length} images, ${megabytes(total)} MB in public/images/`);
}
