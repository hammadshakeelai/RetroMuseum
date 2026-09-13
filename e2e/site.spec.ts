import { expect, test } from "@playwright/test";

test("the hall steps through the collection", async ({ page }) => {
  await page.goto("./");
  const title = page.locator("#featured-title");
  const first = (await title.textContent()) ?? "";
  await page.getByRole("button", { name: "Next" }).click();
  await expect(title).not.toHaveText(first);
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(title).toHaveText(first);
});

test("the family filter shows only matching exhibits", async ({ page }) => {
  await page.goto("exhibits/");
  await page.getByRole("button", { name: "Boot-sector" }).click();
  const visible = page.locator(".card:not([hidden])");
  await expect(visible.first()).toBeVisible();
  const families = await visible.evaluateAll((cards) => cards.map((card) => card.getAttribute("data-family")));
  expect(new Set(families)).toEqual(new Set(["boot-sector"]));
  await expect(page.locator('.card[data-family="dos"]').first()).toBeHidden();
});

test("an exhibit page has its own title and preview image", async ({ page }) => {
  await page.goto("exhibits/tetros/");
  await expect(page).toHaveTitle("RetroMuseum: TetrOS");
  const image = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(image).toMatch(/^https:\/\/hammadshakeelai\.github\.io\/.+\.png$/);
});

test("copyrighted exhibits say where they run and link there", async ({ page }) => {
  await page.goto("exhibits/windows1/");
  await expect(
    page.getByText("Copyrighted software, shown for its history. It runs on copy.sh, the v86 project's site; RetroMuseum doesn't host it."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Run it on copy.sh" })).toHaveAttribute("href", "https://copy.sh/v86/?profile=windows1");
});

test("an unknown page shows File not found", async ({ page }) => {
  await page.goto("exhibits/not-an-exhibit/");
  await expect(page.getByText("The page you asked for isn't in the collection.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the exhibit hall" })).toBeVisible();
});

test("Boot it runs TetrOS from the site's own images, and Stop brings back the poster", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));
  await page.goto("exhibits/tetros/");
  await page.getByRole("button", { name: "Boot it" }).click();
  await expect(page.getByRole("button", { name: "Stop" }).first()).toBeVisible();
  await expect
    .poll(
      () =>
        // TetrOS draws its walls and bricks as coloured text cells; SeaBIOS's messages have none.
        page.evaluate(
          () =>
            [...document.querySelectorAll<HTMLElement>(".v86-screen span")].filter(
              (span) => !["", "rgb(0, 0, 0)"].includes(span.style.backgroundColor),
            ).length,
        ),
      { timeout: 120_000 },
    )
    .toBeGreaterThan(0);
  expect(requested.some((url) => new URL(url).pathname.endsWith("/images/tetros.img"))).toBe(true);
  expect(requested.some((url) => new URL(url).hostname === "i.copy.sh")).toBe(false);
  await page.locator("#stop").click();
  await expect(page.getByRole("button", { name: "Boot it" })).toBeVisible();
});

test("a small graphics screen fits its area on a large window", async ({ page }) => {
  // v86 shows canvases up to 640 pixels wide at double size on large windows.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("exhibits/floppybird/");
  await page.getByRole("button", { name: "Boot it" }).click();
  const canvas = page.locator(".v86-screen canvas");
  await expect(canvas).toBeVisible({ timeout: 120_000 });
  await expect
    .poll(async () => {
      const [shown, area] = await Promise.all([canvas.boundingBox(), page.locator("#screen-area").boundingBox()]);
      if (!shown || !area) return false;
      const inside =
        shown.x >= area.x - 1 &&
        shown.y >= area.y - 1 &&
        shown.x + shown.width <= area.x + area.width + 1 &&
        shown.y + shown.height <= area.y + area.height + 1;
      const fills = Math.abs(shown.width - area.width) < 2 || Math.abs(shown.height - area.height) < 2;
      return inside && fills;
    })
    .toBe(true);
});
