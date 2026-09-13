// Weekly check (.github/workflows/exhibit-health.yml, spec section 9). For each hosted exhibit it checks
// that the disk image's origin still serves the recorded size (so a deploy with an empty cache still works)
// and that the live site serves it; for each copy.sh exhibit, that v86's profile list still has its id.
// Writes exhibit-health.md and exits 1 if anything is wrong. SITE_URL defaults to the RetroMuseum site.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { readExhibits } from "./exhibits.ts";
import { hostedImages } from "./images.ts";

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export const MAIN_JS_URL = "https://raw.githubusercontent.com/copy/v86/master/src/browser/main.js";

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Null when the URL serves an image of `size` bytes; otherwise what went wrong. */
export async function checkImageUrl(url: string, size: number, fetcher: Fetcher = fetch): Promise<string | null> {
  try {
    const response = await fetcher(url, { headers: { Range: "bytes=0-0" }, signal: AbortSignal.timeout(60_000) });
    await response.body?.cancel();
    if (response.status === 206) {
      const total = Number(response.headers.get("content-range")?.split("/")[1]);
      return total === size ? null : `${total} bytes, expected ${size}`;
    }
    if (response.status === 200) {
      const length = Number(response.headers.get("content-length"));
      return length === size ? null : `${length} bytes, expected ${size}`;
    }
    return `HTTP ${response.status}`;
  } catch (error) {
    return message(error);
  }
}

export function profileIds(mainJs: string): Set<string> {
  return new Set([...mainJs.matchAll(/\bid:\s*"([^"]+)"/g)].map((match) => match[1]));
}

export async function checkExhibits(dir: string, siteUrl: string, fetcher: Fetcher = fetch): Promise<string[]> {
  const problems: string[] = [];
  let profiles: Set<string> | null | undefined;

  const loadProfiles = async (): Promise<Set<string> | null> => {
    try {
      const response = await fetcher(MAIN_JS_URL, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return profileIds(await response.text());
    } catch (error) {
      problems.push(`- v86's profile list didn't load (${message(error)})`);
      return null;
    }
  };

  for (const exhibit of await readExhibits(dir)) {
    const [image] = hostedImages([exhibit]);
    if (image) {
      const origin = await checkImageUrl(image.from, image.size, fetcher);
      if (origin) problems.push(`- **${exhibit.slug}**: origin ${image.from} (${origin})`);
      const siteImage = `${siteUrl}images/${image.file}`;
      const site = await checkImageUrl(siteImage, image.size, fetcher);
      if (site) problems.push(`- **${exhibit.slug}**: site ${siteImage} (${site})`);
    }
    const profile = exhibit.data.copyShProfile;
    if (typeof profile === "string") {
      if (profiles === undefined) profiles = await loadProfiles();
      if (profiles && !profiles.has(profile)) problems.push(`- **${exhibit.slug}**: v86 has no profile "${profile}"`);
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const siteUrl = process.env.SITE_URL ?? "https://hammadshakeelai.github.io/RetroMuseum/";
  const problems = await checkExhibits(fileURLToPath(new URL("../src/content/exhibits", import.meta.url)), siteUrl);
  if (problems.length === 0) {
    console.log("Every hosted disk image and copy.sh profile checked out.");
  } else {
    const report = [
      "These exhibits have a problem:",
      "",
      ...problems,
      "",
      "A hosted exhibit whose origin is gone keeps working until the image cache expires: fix its diskImage.from or remove the exhibit. A copy.sh exhibit whose profile is gone no longer opens: update copyShProfile or remove the exhibit.",
      "",
    ].join("\n");
    await writeFile("exhibit-health.md", report);
    console.log(report);
    process.exit(1);
  }
}
