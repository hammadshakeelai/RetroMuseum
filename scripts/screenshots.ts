// Photographs each exhibit after its screenshotWaitSeconds (default 120), then reports whether the screen
// is non-blank and how many megabytes of disk images it downloaded (spec section 9). Hosted exhibits boot
// in a local harness page with images from public/images/ (run npm run images first); copy.sh exhibits
// open on copy.sh's own page.
// Usage: npm run screenshots -- [--only=tetros,windows95] [--write]
// --write saves each passing screenshot and sets downloadEstimateMB and screenshot in its file.
import { chromium, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { copyShUrl } from "../src/lib/exhibits.ts";
import { readExhibits, updateExhibitFile } from "./exhibits.ts";
import type { Harness } from "./screenshots/harness.ts";
import { keyPresses } from "./screenshots/keys.ts";

const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const args = process.argv.slice(2);
const only = args.find((arg) => arg.startsWith("--only="))?.slice("--only=".length).split(",");
const write = args.includes("--write");
const PORT = 5199;
const HARNESS = `http://localhost:${PORT}/`;

const exhibits = (await readExhibits(root("src/content/exhibits"))).filter((exhibit) => !only || only.includes(exhibit.slug));
if (exhibits.length === 0) throw new Error("No matching exhibits");

const server = await createServer({
  configFile: false,
  root: root("scripts/screenshots"),
  publicDir: root("public"),
  logLevel: "warn",
  server: { port: PORT, strictPort: true, fs: { allow: [root(".")] } },
});
await server.listen();
const browser = await chromium.launch();
await mkdir(root("src/content/exhibits/screenshots"), { recursive: true });

async function openHarness(page: Page): Promise<void> {
  await page.goto(HARNESS);
  await page.waitForFunction(() => "harness" in window);
}

/** The emulator screen: its canvas once v86 draws on it, otherwise its text layer. */
async function photograph(page: Page, screen: string): Promise<Buffer> {
  const canvas = page.locator(`${screen} canvas`).first();
  const target = (await canvas.isVisible()) ? canvas : page.locator(`${screen} > div`).first();
  return target.screenshot();
}

const checker = await browser.newPage();
await openHarness(checker);

let failures = 0;
for (const exhibit of exhibits) {
  const waitSeconds = Number(exhibit.data.screenshotWaitSeconds ?? 120);
  const profile = typeof exhibit.data.copyShProfile === "string" ? exhibit.data.copyShProfile : null;
  const page = await browser.newPage({ viewport: { width: 1280, height: 1024 } });
  let bytes = 0;
  page.on("requestfinished", (request) => {
    const url = new URL(request.url());
    const isDisk = profile ? url.hostname === "i.copy.sh" : url.pathname.startsWith("/images/");
    if (!isDisk) return;
    request
      .sizes()
      .then((sizes) => {
        bytes += sizes.responseBodySize;
      })
      .catch(() => {});
  });

  let screen: string;
  if (profile) {
    await page.goto(copyShUrl(profile));
    screen = "#screen_container";
  } else {
    await openHarness(page);
    await page.evaluate((block) => window.harness.boot(block as Parameters<Harness["boot"]>[0]), exhibit.data.v86);
    screen = "#screen .v86-screen";
  }
  await page.waitForTimeout(waitSeconds * 1000);
  const input = typeof exhibit.data.screenshotInput === "string" ? exhibit.data.screenshotInput : "";
  if (input) {
    for (const key of keyPresses(input)) await page.keyboard.press(key, { delay: 30 });
    // Long enough for what the input starts, such as a kernel booting after its loader prompt.
    await page.waitForTimeout(30_000);
  }

  let reason = profile ? "" : ((await page.evaluate(() => window.harness.error())) ?? "");
  let png: Buffer | null = null;
  try {
    png = await photograph(page, screen);
  } catch (error) {
    if (!reason) reason = `no screen to photograph: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`;
  }
  if (!reason && png && (await checker.evaluate((base64) => window.harness.isBlankPng(base64), png.toString("base64")))) {
    reason = "blank screen";
  }
  const pass = reason === "" && png !== null;
  const megabytes = Math.max(1, Math.ceil(bytes / (1024 * 1024)));
  if (pass && write && png) {
    await writeFile(root(`src/content/exhibits/screenshots/${exhibit.slug}.png`), png);
    await updateExhibitFile(exhibit.path, { downloadEstimateMB: megabytes, screenshot: `./screenshots/${exhibit.slug}.png` });
  }
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${exhibit.slug.padEnd(12)} ${String(megabytes).padStart(5)} MB  ${reason}`);
  await page.close();
}

await browser.close();
await server.close();
console.log(`\n${exhibits.length - failures} of ${exhibits.length} exhibits passed.`);
process.exit(failures === 0 ? 0 : 1);
