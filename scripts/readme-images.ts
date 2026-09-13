// Renders docs/banner.png and captures the README screenshots from a running preview
// (npm run images && npm run build && npm run preview first).
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const site = `http://localhost:4321${process.env.BASE_PATH ?? "/RetroMuseum/"}`;
const browser = await chromium.launch();
await mkdir(root("docs/screenshots"), { recursive: true });

const banner = await browser.newPage({ viewport: { width: 1280, height: 320 }, deviceScaleFactor: 2 });
await banner.goto(pathToFileURL(root("docs/banner.html")).href);
await banner.screenshot({ path: root("docs/banner.png") });

const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
await page.goto(site);
// The strip's thumbnails load lazily, after the page's load event.
await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
await page.screenshot({ path: root("docs/screenshots/hall.png") });
await page.goto(`${site}exhibits/kolibrios/`);
await page.getByRole("button", { name: "Boot it" }).click();
await page.waitForTimeout(45_000);
await page.screenshot({ path: root("docs/screenshots/exhibit.png") });

await browser.close();
console.log("Wrote docs/banner.png, docs/screenshots/hall.png and docs/screenshots/exhibit.png");
