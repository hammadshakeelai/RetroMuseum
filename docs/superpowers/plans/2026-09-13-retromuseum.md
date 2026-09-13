# RetroMuseum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the WebOS app with RetroMuseum: an Astro static site where every exhibit page boots a real operating system in v86, with an exhibit hall, an All exhibits grid, sourced history, a weekly disk-image health check, and the repo renamed at the end.

**Architecture:** Astro 7 builds a static site from one Markdown file per exhibit, validated by a content collection whose schema includes the v86 boot settings. Exhibit pages import v86 only when **Boot it** is pressed; a small `Machine` class (unit-tested against a fake emulator) owns booting, download progress, stall detection, errors, and screen fitting. A local Playwright script boots each exhibit in a Vite-served harness page to take its screenshot and measure its download, and a weekly workflow requests every exhibit's first disk-image bytes from i.copy.sh.

**Tech Stack:** Astro 7.3.2, TypeScript 6.0.3 with `@astrojs/check` 0.9.10, v86 0.5.460 (npm), Vitest 5.0.0, happy-dom 20.14.5, Playwright 1.63.0, oxlint 1.82.0, yaml 2.9.1, Vite 8.3.0 (screenshot harness only), Node 24, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-13-retromuseum-design.md`

## Global Constraints

- Repo `hammadshakeelai/WebOS` until Task 12 renames it `hammadshakeelai/RetroMuseum`. Protected default branch `master`. Local path `C:\Users\HP\Documents\GitHub\WebOS` (the folder keeps its name).
- Work branch `retromuseum`, created from `design-specs` (which carries the specs and this plan). The second batch of exhibits goes on `exhibits-2`, created from `master` after the first merge.
- Base path comes from the `BASE_PATH` environment variable (`/WebOS/` or `/RetroMuseum/`, with both slashes), which workflows set to `/${{ github.event.repository.name }}/`. It defaults to `/RetroMuseum/` locally. `site` is `https://hammadshakeelai.github.io`; `trailingSlash` is `"always"`.
- Exact versions: `astro@7.3.2`, `v86@0.5.460`, `@astrojs/check@0.9.10`, `typescript@6.0.3`, `vitest@5.0.0`, `happy-dom@20.14.5`, `@playwright/test@1.63.0`, `oxlint@1.82.0`, `yaml@2.9.1`, `vite@8.3.0`, `@types/node@26.5.1`. TypeScript stays on 6.x: `@astrojs/check` 0.9.10 peers `typescript@^5 || ^6`.
- No UI framework. Client scripts are plain TypeScript bundled by Astro. `v86` is imported with a dynamic `import("v86")` when **Boot it** is pressed.
- Every `.ts` file uses explicit `.ts` import extensions and only erasable TypeScript syntax (no enums, no parameter properties, no namespaces), so Node 24 runs `scripts/*.ts` directly.
- An exhibit's `v86` block allows only: `memory_size`, `vga_memory_size`, `fda`, `hda`, `cdrom` (each `url`, optional `size`, `async`, `use_parts`, `fixed_chunk_size`), `initial_state` (`url`), `acpi`, `boot_order`, `cpuid_level`. Converting from v86's `src/browser/main.js`: `state` becomes `initial_state`, `host` becomes `https://i.copy.sh/`, arithmetic becomes a number, `mac_address_translation` is dropped, and KolibriOS uses `https://i.copy.sh/kolibri.img`.
- The page passes the block to v86 unchanged, adding only `wasm_path`, `bios`, `vga_bios`, `screen: { container, use_graphical_text: true }`, and `autostart: true`.
- The screen container has exactly the structure from v86's `examples/basic.html`: a `<div style="white-space: pre; font: 14px monospace; line-height: 14px">` followed by a `<canvas style="display: none">`.
- v86 names the parts of a split image (`use_parts: true`) `<base>0-<fixed_chunk_size><extension>`, where the extension is the last suffix plus an optional `.zst`, and `-` is added to the base unless it ends in `/` (v86 `src/buffer.js`, `AsyncXHRPartfileBuffer`).
- Stall rule: a download with a known length that started but got no new bytes for 60 seconds. Checked every 5 seconds. Downloads with unknown length, finished downloads, and time with no download never count.
- Ctrl+Alt+Del scancodes (v86 `src/browser/main.js`): `[0x1d, 0x38, 0x53, 0x9d, 0xb8, 0xd3]`.
- User-facing text, exactly:
  - Copyright label: "Copyrighted software, shown for its history. The disk image loads from copy.sh, the v86 project's server."
  - Download line: "Downloads as it runs, about N MB to reach the desktop."
  - Touch note: "Best with a keyboard and mouse"
  - Download and stall dialog: "Couldn't reach the disk image server (i.copy.sh). It may be busy; try again in a minute."
  - No WebAssembly: "This exhibit can't run in this browser: it needs WebAssembly, which this browser doesn't support."
  - Mouse hint: "Press Esc to release the mouse."
  - Toolbar buttons: "Full screen", "Capture mouse", "Ctrl+Alt+Del", "Restart", "Stop". Screen button: "Boot it". Hall: "Visit exhibit", "Previous", "Next".
  - Window titles: "RetroMuseum: <page title>". 404: "File not found", "The page you asked for isn't in the collection.", link "Back to the exhibit hall".
- Families, in display order: `dos` "DOS", `windows` "Windows", `unix-bsd-linux` "Unix, BSD & Linux", `independent` "Independent", `boot-sector` "Boot-sector".
- Proprietary exhibits: `86dos`, `msdos`, `windows1`, `windows2`, `windows31`, `windows95`, `windows98`, `windowsnt4`, `windows2000`, `beos`. All others are `open-source`.
- Required CI check name: `Lint, test, and build`. Keep branch protection, the `github-pages` environment, and Dependabot.
- GitHub Actions versions: `actions/checkout@v7`, `actions/setup-node@v7`, `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`.
- Screenshots are taken locally only, never in CI. Disk images are never committed or published.
- Rename the repo only after the new site is live at `/WebOS/` (Task 12).
- Never `git add .` or `git add -A`: the repo root holds untracked personal files (a screen recording, screenshots, `.claude/`, `.impeccable/`, `.remember/`). Stage exact paths.

## File Structure

```
WebOS/ (renamed RetroMuseum in Task 12)
├── .github/
│   ├── dependabot.yml                   # kept; TypeScript majors ignored
│   ├── ISSUE_TEMPLATE/removal-request.yml
│   └── workflows/
│       ├── ci.yml                       # PRs: "Lint, test, and build"
│       ├── deploy.yml                   # master: build, publish to Pages
│       └── exhibit-health.yml           # weekly + on demand: probe disk images, open an issue
├── astro.config.mjs
├── package.json, package-lock.json, tsconfig.json, vitest.config.ts, playwright.config.ts
├── .oxlintrc.json, .gitignore
├── public/
│   ├── bios/seabios.bin, bios/vgabios.bin   # kept from WebOS
│   └── favicon.svg
├── src/
│   ├── content.config.ts                # exhibits collection schema
│   ├── content/exhibits/<slug>.md       # one file per exhibit
│   ├── content/exhibits/screenshots/<slug>.png
│   ├── lib/
│   │   ├── families.ts                  # family ids, labels, order
│   │   ├── exhibits.ts                  # copyright label, download line, year sort
│   │   ├── filter.ts                    # family filter rule
│   │   ├── hall.ts                      # Previous/Next index stepping
│   │   ├── parts.ts                     # first URL v86 requests for an image
│   │   └── v86-block.ts                 # Zod schema for the v86 block
│   ├── emulator/
│   │   ├── fit.ts                       # fit-to-area scale
│   │   ├── downloads.ts                 # megabytes downloaded, stall detection
│   │   ├── blank.ts                     # blank-screen test on RGBA pixels
│   │   ├── screen.ts                    # screen container DOM
│   │   └── machine.ts                   # boot, stop, errors, fit, toolbar actions
│   ├── scripts/
│   │   ├── hall.ts                      # hall Previous/Next and strip
│   │   ├── filter.ts                    # All exhibits family filter
│   │   └── exhibit-page.ts              # Boot it and the machine toolbar
│   ├── styles/theme.css                 # machine-room look
│   ├── layouts/Window.astro             # page shell, title bar, menu bar, meta tags
│   ├── pages/
│   │   ├── index.astro                  # Exhibit hall
│   │   ├── exhibits/index.astro         # All exhibits
│   │   ├── exhibits/[slug].astro        # Exhibit page
│   │   ├── about.astro
│   │   └── 404.astro
│   └── **/*.test.ts                     # unit tests next to the code
├── scripts/
│   ├── exhibits.ts (+ .test.ts)         # read and edit exhibit frontmatter
│   ├── screenshots.ts                   # boot each exhibit, save screenshot, measure download
│   ├── screenshots/index.html, harness.ts
│   ├── exhibit-health.ts (+ .test.ts)   # weekly disk-image probe
│   └── readme-images.ts                 # banner and README screenshots
├── e2e/site.spec.ts
├── docs/banner.html, docs/banner.png, docs/screenshots/{hall,exhibit}.png
├── docs/superpowers/specs/, docs/superpowers/plans/
├── README.md, LICENSE, THIRD_PARTY_NOTICES.md
```

---

### Task 1: Branch, remove the old app, and set up the Astro toolchain

**Files:**
- Delete: `src/`, `scripts/`, `public/v86/`, `public/images/`, `public/icons.svg`, `public/favicon.svg`, `docs/banner/`, `docs/screenshots/`, `docs/DEPLOYMENT.md`, `index.html`, `vite.config.ts`, `tsconfig.app.json`, `tsconfig.node.json`, `.oxlintrc.json`
- Create: `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.oxlintrc.json`, `public/favicon.svg`, `src/styles/theme.css`, `src/layouts/Window.astro`, `src/pages/404.astro`
- Modify: `package.json` (rewritten), `package-lock.json` (regenerated), `.gitignore` (rewritten), `.github/dependabot.yml`, `.github/workflows/ci.yml` (rewritten), `.github/workflows/deploy.yml` (rewritten)

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:e2e`, `screenshots`, `health`, `readme-images`; layout `Window.astro` with props `title: string`, `description: string`, `current?: "hall" | "exhibits" | "about"`, `image?: string` (a base-prefixed image path made absolute for `og:image`); CSS classes used by later tasks (`window`, `title-bar`, `menu-bar`, `content`, `bevel-button`, `sunken`, `placard`, `maker-year`, `hall`, `hall-controls`, `strip`, `filter`, `grid`, `card`, `exhibit-screen`, `screen-area`, `poster`, `poster-overlay`, `boot-button`, `download-line`, `touch-note`, `live`, `v86-screen`, `machine-toolbar`, `progress`, `hint`, `copyright`, `exhibit-body`, `story`, `facts`, `dialog-body`, `dialog-actions`, `not-found`).

- [ ] **Step 1: Create the work branch**

```bash
cd /c/Users/HP/Documents/GitHub/WebOS
git fetch origin
git switch design-specs
git pull --ff-only
git switch -c retromuseum
git status --short
```

Expected: only untracked (`??`) entries: the screen recording, screenshots, `.claude/`, `.impeccable/`, `.remember/`.

- [ ] **Step 2: Remove the old app**

```bash
git rm -r -q src scripts public/v86 public/images public/icons.svg public/favicon.svg docs/banner docs/screenshots docs/DEPLOYMENT.md index.html vite.config.ts tsconfig.app.json tsconfig.node.json .oxlintrc.json
rm -rf dist node_modules package-lock.json
git ls-files public
```

Expected: `public/bios/seabios.bin` and `public/bios/vgabios.bin` only.

- [ ] **Step 3: Write `package.json` and install**

`package.json`:
```json
{
  "name": "retromuseum",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview --port 4321",
    "lint": "oxlint --deny-warnings src",
    "typecheck": "astro check",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "screenshots": "node scripts/screenshots.ts",
    "health": "node scripts/exhibit-health.ts",
    "readme-images": "node scripts/readme-images.ts"
  },
  "engines": {
    "node": ">=22.12.0"
  }
}
```

```bash
npm install --save-exact astro@7.3.2 v86@0.5.460
npm install --save-dev --save-exact @astrojs/check@0.9.10 typescript@6.0.3 vitest@5.0.0 happy-dom@20.14.5 @playwright/test@1.63.0 oxlint@1.82.0 yaml@2.9.1 vite@8.3.0 @types/node@26.5.1
npm ls vite
```

Expected: both installs exit 0; `npm ls vite` shows a single `vite@8.3.0` (deduped under `astro`).

- [ ] **Step 4: Write the config files**

`astro.config.mjs`:
```js
// The base path follows the repository name: /WebOS/ before the rename, /RetroMuseum/ after it.
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://hammadshakeelai.github.io",
  base: process.env.BASE_PATH ?? "/RetroMuseum/",
  trailingSlash: "always",
});
```

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules", "test-results", "playwright-report"],
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "noEmit": true
  }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    passWithNoTests: true,
  },
});
```

`.oxlintrc.json`:
```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "ignorePatterns": ["dist", ".astro"]
}
```

`.gitignore`:
```
node_modules
dist
.astro
test-results
playwright-report
exhibit-health.md
*.log
.DS_Store
```

In `.github/dependabot.yml`, add an `ignore` list to the npm entry so Dependabot doesn't propose TypeScript 7 (which `@astrojs/check` doesn't support):
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    groups:
      npm-minor-and-patch:
        update-types:
          - minor
          - patch
    ignore:
      - dependency-name: typescript
        update-types: ["version-update:semver-major"]

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

- [ ] **Step 5: Write the theme, the page layout, the favicon, and the 404 page**

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect x="3" y="4" width="26" height="19" fill="#d9d2c0" stroke="#5c584b" stroke-width="2"/>
  <rect x="7" y="8" width="18" height="11" fill="#000080"/>
  <rect x="11" y="24" width="10" height="3" fill="#5c584b"/>
  <rect x="7" y="27" width="18" height="2" fill="#5c584b"/>
</svg>
```

`src/styles/theme.css`:
```css
:root {
  --putty: #d9d2c0;
  --panel: #c9c1ad;
  --hi: #f4efe2;
  --lo: #8a8472;
  --dark: #5c584b;
  --ink: #1d1d1d;
  --muted: #3d3a30;
  --title-a: #000080;
  --title-b: #1084d0;
  --screen: #101010;
}
* { box-sizing: border-box; }
html { background: var(--putty); color: var(--ink); font: 15px/1.5 Tahoma, Verdana, "Segoe UI", sans-serif; }
body { margin: 0; padding: 16px; }
a { color: var(--title-a); }
img { max-width: 100%; height: auto; display: block; }
h2 { font-size: 1.15rem; margin: 1.2em 0 0.4em; }

.window { max-width: 1100px; margin: 0 auto; background: var(--panel); border: 2px solid; border-color: var(--hi) var(--lo) var(--lo) var(--hi); }
.title-bar { background: linear-gradient(90deg, var(--title-a), var(--title-b)); color: #fff; font-weight: bold; padding: 4px 8px; }
.title-bar h1 { font-size: inherit; margin: 0; }
.menu-bar { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px 6px; border-bottom: 1px solid var(--lo); }
.menu-bar a { color: var(--ink); text-decoration: none; padding: 2px 8px; }
.menu-bar a[aria-current="page"], .menu-bar a:hover { background: var(--title-a); color: #fff; }
.content { padding: 16px; }

.bevel-button { font: inherit; color: var(--ink); background: var(--panel); border: 2px solid; border-color: var(--hi) var(--dark) var(--dark) var(--hi); padding: 3px 12px; cursor: pointer; text-decoration: none; display: inline-block; }
.bevel-button:active, .bevel-button[aria-pressed="true"] { border-color: var(--dark) var(--hi) var(--hi) var(--dark); }
.bevel-button:disabled { color: var(--lo); cursor: default; }
.bevel-button:focus-visible, .menu-bar a:focus-visible, .strip button:focus-visible, .card a:focus-visible { outline: 2px dotted var(--ink); outline-offset: 2px; }
.sunken { border: 2px solid; border-color: var(--lo) var(--hi) var(--hi) var(--lo); background: var(--screen); }

.placard { background: var(--hi); border: 1px solid var(--lo); padding: 12px 16px; }
.placard h2 { margin: 0 0 4px; font-size: 1.6rem; }
.maker-year { margin: 0 0 8px; color: var(--muted); }

.hall { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 16px; align-items: start; }
.hall .sunken img { width: 100%; image-rendering: pixelated; }
.hall-controls { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.strip { display: flex; gap: 8px; overflow-x: auto; padding: 12px 2px 4px; margin-top: 16px; }
.strip button { flex: 0 0 132px; font: inherit; font-size: 0.8rem; text-align: left; color: var(--ink); background: var(--panel); border: 2px solid; border-color: var(--hi) var(--dark) var(--dark) var(--hi); padding: 4px; cursor: pointer; }
.strip button[aria-current="true"] { border-color: var(--dark) var(--hi) var(--hi) var(--dark); background: var(--hi); }
.strip img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: var(--screen); image-rendering: pixelated; margin-bottom: 4px; }

.filter { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; list-style: none; margin: 0; padding: 0; }
.card a { display: block; height: 100%; color: var(--ink); text-decoration: none; background: var(--hi); border: 1px solid var(--lo); padding: 8px; }
.card a:hover { outline: 2px solid var(--title-a); }
.card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: var(--screen); image-rendering: pixelated; }
.card h2 { font-size: 1rem; margin: 8px 0 0; }
.card p { margin: 2px 0 0; color: var(--muted); font-size: 0.85rem; }

.exhibit-screen { margin-bottom: 16px; }
.screen-area { position: relative; aspect-ratio: 4 / 3; max-height: 75vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.poster { position: absolute; inset: 0; }
.poster[hidden] { display: none; }
.poster img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; opacity: 0.55; }
.poster-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 16px; color: #fff; text-align: center; text-shadow: 0 1px 2px #000; }
.boot-button { font-size: 1.4rem; padding: 10px 28px; }
.download-line { margin: 0; }
.touch-note { display: none; margin: 0; }
@media (pointer: coarse) { .touch-note { display: block; } }
.live { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; cursor: pointer; }
.live[hidden] { display: none; }
.v86-screen canvas { image-rendering: pixelated; }
.v86-screen:fullscreen { display: flex; align-items: center; justify-content: center; background: #000; }
.machine-toolbar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 0; }
.machine-toolbar[hidden] { display: none; }
.progress { width: 140px; height: 16px; border: 2px solid; border-color: var(--lo) var(--hi) var(--hi) var(--lo); background: #fff; }
.progress > div { height: 100%; width: 0; background: var(--title-a); }
.hint { color: var(--muted); font-size: 0.85rem; }

.copyright { background: #fff7d6; border: 1px solid var(--lo); padding: 6px 10px; margin: 0 0 16px; }
.exhibit-body { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 24px; }
.story { max-width: 70ch; }
.facts dt { font-weight: bold; }
.facts dd { margin: 0 0 6px; }

dialog { padding: 0; border: 2px solid; border-color: var(--hi) var(--lo) var(--lo) var(--hi); background: var(--panel); color: var(--ink); max-width: min(520px, 92vw); }
dialog::backdrop { background: rgba(0, 0, 0, 0.35); }
.dialog-body { padding: 12px 16px; margin: 0; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 6px; padding: 0 16px 12px; }
.not-found { max-width: 440px; margin: 40px auto; }

@media (max-width: 760px) {
  body { padding: 0; }
  .content { padding: 10px; }
  .hall, .exhibit-body { grid-template-columns: 1fr; }
}
```

`src/layouts/Window.astro`:
```astro
---
import "../styles/theme.css";

interface Props {
  title: string;
  description: string;
  current?: "hall" | "exhibits" | "about";
  image?: string;
}

const { title, description, current, image } = Astro.props;
const base = import.meta.env.BASE_URL;
const pageTitle = `RetroMuseum: ${title}`;
const canonical = new URL(Astro.url.pathname, Astro.site).href;
const imageUrl = image ? new URL(image, Astro.site).href : undefined;
const links = [
  { id: "hall", href: base, label: "Exhibit hall" },
  { id: "exhibits", href: `${base}exhibits/`, label: "All exhibits" },
  { id: "about", href: `${base}about/`, label: "About" },
];
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{pageTitle}</title>
    <meta name="description" content={description} />
    <link rel="icon" href={`${base}favicon.svg`} type="image/svg+xml" />
    <link rel="canonical" href={canonical} />
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:type" content="website" />
    {imageUrl && <meta property="og:image" content={imageUrl} />}
    <meta name="twitter:card" content={imageUrl ? "summary_large_image" : "summary"} />
  </head>
  <body>
    <div class="window">
      <div class="title-bar"><h1>{pageTitle}</h1></div>
      <nav class="menu-bar" aria-label="Main">
        {links.map((link) => (
          <a href={link.href} aria-current={current === link.id ? "page" : undefined}>{link.label}</a>
        ))}
      </nav>
      <main class="content">
        <slot />
      </main>
    </div>
  </body>
</html>
```

`src/pages/404.astro`:
```astro
---
import Window from "../layouts/Window.astro";

const base = import.meta.env.BASE_URL;
---
<Window title="File not found" description="This page isn't in the RetroMuseum collection.">
  <section class="window not-found" aria-labelledby="not-found-title">
    <div class="title-bar" id="not-found-title">File not found</div>
    <div class="dialog-body">
      <p>The page you asked for isn't in the collection.</p>
      <p><a class="bevel-button" href={base}>Back to the exhibit hall</a></p>
    </div>
  </section>
</Window>
```

- [ ] **Step 6: Rewrite the workflows**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate:
    name: Lint, test, and build
    runs-on: ubuntu-latest
    env:
      BASE_PATH: /${{ github.event.repository.name }}/
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm

      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

`.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    name: Build and deploy
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    env:
      BASE_PATH: /${{ github.event.repository.name }}/
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm

      - run: npm ci
      - run: npm run build

      - uses: actions/configure-pages@v6

      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 7: Verify the toolchain**

```bash
npm run lint; echo "LINT $?"
npm run typecheck; echo "TYPECHECK $?"
npm test; echo "TEST $?"
npm run build; echo "BUILD $?"
ls dist
```

Expected: all four exit 0; `dist` contains `404.html`, `favicon.svg`, `bios/`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts .oxlintrc.json .gitignore public/favicon.svg src/styles/theme.css src/layouts/Window.astro src/pages/404.astro .github/dependabot.yml .github/workflows/ci.yml .github/workflows/deploy.yml
git commit -m "chore: replace the WebOS app with an Astro toolchain for RetroMuseum"
```

---

### Task 2: Pure helpers: families, text, filter, hall stepping, image part names, v86 block schema

**Files:**
- Create: `src/lib/families.ts`, `src/lib/exhibits.ts`, `src/lib/filter.ts`, `src/lib/hall.ts`, `src/lib/parts.ts`, `src/lib/v86-block.ts`
- Test: `src/lib/families.test.ts`, `src/lib/exhibits.test.ts`, `src/lib/filter.test.ts`, `src/lib/hall.test.ts`, `src/lib/parts.test.ts`, `src/lib/v86-block.test.ts`

**Interfaces:**
- Produces:
  - `families.ts`: `FAMILIES: readonly { id, label }[]`, `type FamilyId`, `FAMILY_IDS: readonly ["dos", "windows", "unix-bsd-linux", "independent", "boot-sector"]`, `familyLabel(id: FamilyId): string`, `familiesPresent(ids: readonly FamilyId[]): FamilyId[]`
  - `exhibits.ts`: `COPYRIGHT_LABEL: string`, `downloadLine(megabytes: number): string`, `byYear(a: { year: number; title: string }, b: { year: number; title: string }): number`
  - `filter.ts`: `matchesFilter(family: string, filter: string): boolean` (`filter` is `"all"` or a family id)
  - `hall.ts`: `stepIndex(index: number, delta: number, length: number): number`
  - `parts.ts`: `firstRequestUrl(image: { url: string; use_parts?: boolean; fixed_chunk_size?: number }): string`, `exhibitUrls(block: V86Block): string[]`
  - `v86-block.ts`: `v86BlockSchema` (Zod), `type V86Block`

- [ ] **Step 1: Write the failing tests**

`src/lib/families.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { FAMILIES, familiesPresent, familyLabel } from "./families.ts";

describe("families", () => {
  it("lists the five families in display order", () => {
    expect(FAMILIES.map((family) => family.label)).toEqual(["DOS", "Windows", "Unix, BSD & Linux", "Independent", "Boot-sector"]);
  });

  it("labels a family id", () => {
    expect(familyLabel("unix-bsd-linux")).toBe("Unix, BSD & Linux");
  });

  it("keeps only families that have exhibits, in display order", () => {
    expect(familiesPresent(["boot-sector", "dos", "boot-sector"])).toEqual(["dos", "boot-sector"]);
  });
});
```

`src/lib/exhibits.test.ts`:
```ts
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
```

`src/lib/filter.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { matchesFilter } from "./filter.ts";

describe("matchesFilter", () => {
  it("shows everything for All", () => {
    expect(matchesFilter("dos", "all")).toBe(true);
  });

  it("shows only the chosen family", () => {
    expect(matchesFilter("dos", "dos")).toBe(true);
    expect(matchesFilter("windows", "dos")).toBe(false);
  });
});
```

`src/lib/hall.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { stepIndex } from "./hall.ts";

describe("stepIndex", () => {
  it("moves forward and back", () => {
    expect(stepIndex(1, 1, 5)).toBe(2);
    expect(stepIndex(1, -1, 5)).toBe(0);
  });

  it("wraps at both ends", () => {
    expect(stepIndex(4, 1, 5)).toBe(0);
    expect(stepIndex(0, -1, 5)).toBe(4);
  });

  it("returns 0 for an empty collection", () => {
    expect(stepIndex(3, 1, 0)).toBe(0);
  });
});
```

`src/lib/parts.test.ts`:
```ts
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
```

`src/lib/v86-block.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { v86BlockSchema } from "./v86-block.ts";

const windows95 = {
  memory_size: 67108864,
  hda: { url: "https://i.copy.sh/windows95-v3/.img", size: 471859200, async: true, fixed_chunk_size: 262144, use_parts: true },
};

describe("v86BlockSchema", () => {
  it("accepts a v86 profile", () => {
    expect(v86BlockSchema.safeParse(windows95).success).toBe(true);
  });

  it("accepts a snapshot, ACPI and a CPUID level", () => {
    const block = { ...windows95, initial_state: { url: "https://i.copy.sh/x.bin.zst" }, acpi: true, cpuid_level: 2 };
    expect(v86BlockSchema.safeParse(block).success).toBe(true);
  });

  it("rejects keys v86's site uses that the page doesn't pass on", () => {
    expect(v86BlockSchema.safeParse({ ...windows95, state: { url: "https://i.copy.sh/x.bin.zst" } }).success).toBe(false);
    expect(v86BlockSchema.safeParse({ ...windows95, mac_address_translation: true }).success).toBe(false);
  });

  it("needs a disk", () => {
    expect(v86BlockSchema.safeParse({ memory_size: 67108864 }).success).toBe(false);
  });

  it("needs a chunk size for a split image", () => {
    expect(v86BlockSchema.safeParse({ hda: { url: "https://i.copy.sh/a/.img", use_parts: true } }).success).toBe(false);
  });

  it("needs full URLs", () => {
    expect(v86BlockSchema.safeParse({ fda: { url: "//i.copy.sh/tetros.img" } }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib`
Expected: FAIL, "Failed to load url ./families.ts" (and the same for each module).

- [ ] **Step 3: Write the modules**

`src/lib/families.ts`:
```ts
export const FAMILIES = [
  { id: "dos", label: "DOS" },
  { id: "windows", label: "Windows" },
  { id: "unix-bsd-linux", label: "Unix, BSD & Linux" },
  { id: "independent", label: "Independent" },
  { id: "boot-sector", label: "Boot-sector" },
] as const;

export type FamilyId = (typeof FAMILIES)[number]["id"];

export const FAMILY_IDS = ["dos", "windows", "unix-bsd-linux", "independent", "boot-sector"] as const;

export function familyLabel(id: FamilyId): string {
  return FAMILIES.find((family) => family.id === id)?.label ?? id;
}

export function familiesPresent(ids: readonly FamilyId[]): FamilyId[] {
  return FAMILY_IDS.filter((id) => ids.includes(id));
}
```

`src/lib/exhibits.ts`:
```ts
export const COPYRIGHT_LABEL =
  "Copyrighted software, shown for its history. The disk image loads from copy.sh, the v86 project's server.";

export function downloadLine(megabytes: number): string {
  return `Downloads as it runs, about ${megabytes} MB to reach the desktop.`;
}

export function byYear(a: { year: number; title: string }, b: { year: number; title: string }): number {
  return a.year - b.year || a.title.localeCompare(b.title);
}
```

`src/lib/filter.ts`:
```ts
/** `filter` is "all" or a family id. */
export function matchesFilter(family: string, filter: string): boolean {
  return filter === "all" || family === filter;
}
```

`src/lib/hall.ts`:
```ts
export function stepIndex(index: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (((index + delta) % length) + length) % length;
}
```

`src/lib/v86-block.ts`:
```ts
import { z } from "astro/zod";

const diskImage = z
  .strictObject({
    url: z.url(),
    size: z.number().int().positive().optional(),
    async: z.boolean().optional(),
    use_parts: z.boolean().optional(),
    fixed_chunk_size: z.number().int().positive().optional(),
  })
  .refine((image) => !image.use_parts || image.fixed_chunk_size !== undefined, "use_parts needs fixed_chunk_size");

/** The v86 constructor options an exhibit may set (spec section 4). */
export const v86BlockSchema = z
  .strictObject({
    memory_size: z.number().int().positive().optional(),
    vga_memory_size: z.number().int().positive().optional(),
    fda: diskImage.optional(),
    hda: diskImage.optional(),
    cdrom: diskImage.optional(),
    initial_state: z.strictObject({ url: z.url() }).optional(),
    acpi: z.boolean().optional(),
    boot_order: z.number().int().positive().optional(),
    cpuid_level: z.number().int().positive().optional(),
  })
  .refine((block) => Boolean(block.fda ?? block.hda ?? block.cdrom), "needs a disk: fda, hda or cdrom");

export type V86Block = z.infer<typeof v86BlockSchema>;
```

`src/lib/parts.ts`:
```ts
import type { V86Block } from "./v86-block.ts";

interface Image {
  url: string;
  use_parts?: boolean;
  fixed_chunk_size?: number;
}

/**
 * The first URL v86 requests for an image. A split image (use_parts) loads in parts named like
 * v86's AsyncXHRPartfileBuffer (src/buffer.js): "<base>0-<chunk size><extension>".
 */
export function firstRequestUrl(image: Image): string {
  if (!image.use_parts) return image.url;
  const extension = /\.[^.]+(\.zst)?$/.exec(image.url)?.[0] ?? "";
  let basename = image.url.slice(0, image.url.length - extension.length);
  if (!basename.endsWith("/")) basename += "-";
  return `${basename}0-${image.fixed_chunk_size}${extension}`;
}

/** Every URL an exhibit needs to start: each disk's first request, then its snapshot. */
export function exhibitUrls(block: V86Block): string[] {
  const disks = [block.fda, block.hda, block.cdrom].filter((disk) => disk !== undefined);
  const urls = disks.map((disk) => firstRequestUrl(disk));
  if (block.initial_state) urls.push(block.initial_state.url);
  return urls;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/lib; npm run lint; npm run typecheck`
Expected: all tests PASS; lint and typecheck exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib
git commit -m "feat: add family, text, filter, hall, image part and v86 block helpers"
```

---

### Task 3: Emulator core: fitting, downloads, blank screens, screen DOM, and the Machine

**Files:**
- Create: `src/emulator/fit.ts`, `src/emulator/downloads.ts`, `src/emulator/blank.ts`, `src/emulator/screen.ts`, `src/emulator/machine.ts`
- Test: `src/emulator/fit.test.ts`, `src/emulator/downloads.test.ts`, `src/emulator/blank.test.ts`, `src/emulator/screen.test.ts`, `src/emulator/machine.test.ts`

**Interfaces:**
- Consumes: `type V86Block` from `src/lib/v86-block.ts`.
- Produces:
  - `fit.ts`: `interface Size { width: number; height: number }`, `fitScale(area: Size, content: Size): number`
  - `downloads.ts`: `class DownloadMeter { record(file: string, loaded: number): void; megabytes(): number }`, `class StallWatch { constructor(timeoutMs: number); progress(file: string, loaded: number, total: number, lengthComputable: boolean, now: number): void; isStalled(now: number): boolean }`
  - `blank.ts`: `isBlank(pixels: Uint8ClampedArray, minFraction?: number): boolean`
  - `screen.ts`: `interface ScreenElements { container: HTMLElement; canvas: HTMLCanvasElement }`, `createScreen(doc: Document): ScreenElements`, `naturalSize(canvas: HTMLCanvasElement): Size`
  - `machine.ts`: `type MachineError = "download" | "stalled" | "no-wasm"`, `type MachineState`, `interface Emulator`, `interface Runtime { wasmUrl; biosUrl; vgaBiosUrl }`, `interface MachineDeps`, `CTRL_ALT_DEL`, `STALL_MS`, `v86Options(block, runtime, container)`, `class Machine { boot(block, runtime, container): Promise<void>; stop(): Promise<void>; fit(area, content): void; fullscreen(): void; captureMouse(): void; ctrlAltDel(): void }`

- [ ] **Step 1: Write the failing tests**

`src/emulator/fit.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { fitScale } from "./fit.ts";

describe("fitScale", () => {
  it("scales up to fill the tighter side", () => {
    expect(fitScale({ width: 1440, height: 1000 }, { width: 720, height: 400 })).toBe(2);
  });

  it("scales down and keeps the aspect ratio", () => {
    expect(fitScale({ width: 512, height: 600 }, { width: 1024, height: 768 })).toBe(0.5);
  });

  it("leaves the scale at 1 before anything is drawn", () => {
    expect(fitScale({ width: 800, height: 600 }, { width: 0, height: 0 })).toBe(1);
    expect(fitScale({ width: 0, height: 0 }, { width: 640, height: 480 })).toBe(1);
  });
});
```

`src/emulator/downloads.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { DownloadMeter, StallWatch } from "./downloads.ts";

const MB = 1024 * 1024;

describe("DownloadMeter", () => {
  it("adds the latest byte count of every file", () => {
    const meter = new DownloadMeter();
    meter.record("a", 1 * MB);
    meter.record("a", 2 * MB);
    meter.record("b", 1 * MB);
    expect(meter.megabytes()).toBe(3);
  });

  it("ignores a lower count for a file", () => {
    const meter = new DownloadMeter();
    meter.record("a", 2 * MB);
    meter.record("a", 1 * MB);
    expect(meter.megabytes()).toBe(2);
  });
});

describe("StallWatch", () => {
  it("fires when a started download gets no bytes for 60 seconds", () => {
    const watch = new StallWatch(60_000);
    watch.progress("disk", 100, 1000, true, 0);
    expect(watch.isStalled(59_999)).toBe(false);
    expect(watch.isStalled(60_000)).toBe(true);
  });

  it("restarts the clock when new bytes arrive", () => {
    const watch = new StallWatch(60_000);
    watch.progress("disk", 100, 1000, true, 0);
    watch.progress("disk", 200, 1000, true, 50_000);
    expect(watch.isStalled(100_000)).toBe(false);
    expect(watch.isStalled(110_000)).toBe(true);
  });

  it("never fires for a finished download", () => {
    const watch = new StallWatch(60_000);
    watch.progress("disk", 100, 1000, true, 0);
    watch.progress("disk", 1000, 1000, true, 1_000);
    expect(watch.isStalled(1_000_000)).toBe(false);
  });

  it("never fires for a download of unknown length", () => {
    const watch = new StallWatch(60_000);
    watch.progress("disk", 100, 0, false, 0);
    expect(watch.isStalled(1_000_000)).toBe(false);
  });

  it("never fires while nothing is downloading", () => {
    expect(new StallWatch(60_000).isStalled(1_000_000)).toBe(false);
  });
});
```

`src/emulator/blank.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { isBlank } from "./blank.ts";

function pixels(count: number, lit: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < lit; i++) data.set([255, 255, 255, 255], i * 4);
  return data;
}

describe("isBlank", () => {
  it("is blank when every pixel matches", () => {
    expect(isBlank(pixels(10_000, 0))).toBe(true);
  });

  it("isn't blank once a small share of pixels differ", () => {
    expect(isBlank(pixels(10_000, 100))).toBe(false);
  });

  it("treats a lone cursor as blank", () => {
    expect(isBlank(pixels(100_000, 20))).toBe(true);
  });

  it("is blank with no pixels", () => {
    expect(isBlank(new Uint8ClampedArray())).toBe(true);
  });
});
```

`src/emulator/screen.test.ts`:
```ts
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createScreen, naturalSize } from "./screen.ts";

describe("createScreen", () => {
  it("builds the structure v86's ScreenAdapter expects", () => {
    const { container, canvas } = createScreen(document);
    expect(container.className).toBe("v86-screen");
    expect(container.children).toHaveLength(2);
    const text = container.children[0] as HTMLElement;
    expect(text.tagName).toBe("DIV");
    expect(text.style.whiteSpace).toBe("pre");
    expect(text.style.lineHeight).toBe("14px");
    expect(container.children[1]).toBe(canvas);
    expect(canvas.style.display).toBe("none");
  });

  it("measures the canvas in pixels", () => {
    const { canvas } = createScreen(document);
    canvas.width = 720;
    canvas.height = 400;
    expect(naturalSize(canvas)).toEqual({ width: 720, height: 400 });
  });
});
```

`src/emulator/machine.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import type { V86Block } from "../lib/v86-block.ts";
import { CTRL_ALT_DEL, Machine, type Emulator, type MachineState } from "./machine.ts";

const MB = 1024 * 1024;
const block: V86Block = { fda: { url: "https://i.copy.sh/tetros.img", size: 512 } };
const runtime = { wasmUrl: "/v86.wasm", biosUrl: "/bios/seabios.bin", vgaBiosUrl: "/bios/vgabios.bin" };
const container = {} as unknown as HTMLElement;

class FakeEmulator implements Emulator {
  listeners = new Map<string, (argument?: unknown) => void>();
  scale: [number, number] | null = null;
  scancodes: number[] = [];
  destroyed = false;

  add_listener(event: string, listener: (argument: never) => void): void {
    this.listeners.set(event, listener as (argument?: unknown) => void);
  }

  emit(event: string, argument?: unknown): void {
    this.listeners.get(event)?.(argument);
  }

  screen_set_scale(sx: number, sy: number): void {
    this.scale = [sx, sy];
  }

  screen_go_fullscreen(): void {}

  lock_mouse(): void {}

  keyboard_send_scancodes(codes: number[]): void {
    this.scancodes.push(...codes);
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
  }
}

function setup(options: { wasm?: boolean; create?: () => Promise<FakeEmulator> } = {}) {
  const states: MachineState[] = [];
  const created: Record<string, unknown>[] = [];
  const emulators: FakeEmulator[] = [];
  const resizes = { count: 0 };
  let now = 0;
  let tick: (() => void) | null = null;
  const machine = new Machine({
    create: async (machineOptions) => {
      created.push(machineOptions);
      const emulator = options.create ? await options.create() : new FakeEmulator();
      emulators.push(emulator);
      return emulator;
    },
    hasWebAssembly: () => options.wasm ?? true,
    now: () => now,
    every: (_ms, fn) => {
      tick = fn;
      return () => {
        tick = null;
      };
    },
    onState: (state) => states.push(state),
    onScreenSizeChange: () => {
      resizes.count++;
    },
  });
  const advance = (ms: number) => {
    now += ms;
    tick?.();
  };
  return { machine, states, created, emulators, resizes, advance };
}

describe("Machine", () => {
  it("passes the block to v86 unchanged, adding only the runtime, screen and autostart", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    expect(t.created[0]).toEqual({
      ...block,
      wasm_path: "/v86.wasm",
      bios: { url: "/bios/seabios.bin" },
      vga_bios: { url: "/bios/vgabios.bin" },
      screen: { container, use_graphical_text: true },
      autostart: true,
    });
    expect(t.states.at(-1)).toEqual({ kind: "running", downloadedMB: 0 });
  });

  it("reports megabytes downloaded", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    t.emulators[0].emit("download-progress", { file_name: "a", loaded: 2 * MB, total: 4 * MB, lengthComputable: true });
    expect(t.states.at(-1)).toEqual({ kind: "running", downloadedMB: 2 });
  });

  it("shows a download error", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    t.emulators[0].emit("download-error");
    expect(t.states.at(-1)).toEqual({ kind: "error", error: "download", downloadedMB: 0 });
  });

  it("reports a stall when a started download gets no bytes for 60 seconds", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    t.emulators[0].emit("download-progress", { file_name: "a", loaded: MB, total: 4 * MB, lengthComputable: true });
    t.advance(55_000);
    expect(t.states.at(-1)?.kind).toBe("running");
    t.advance(5_000);
    expect(t.states.at(-1)).toEqual({ kind: "error", error: "stalled", downloadedMB: 1 });
  });

  it("never reports a stall while nothing is downloading", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    t.advance(600_000);
    expect(t.states.at(-1)?.kind).toBe("running");
  });

  it("Stop destroys the emulator and returns to idle", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    await t.machine.stop();
    expect(t.emulators[0].destroyed).toBe(true);
    expect(t.states.at(-1)).toEqual({ kind: "idle" });
  });

  it("booting again destroys the previous emulator first", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    await t.machine.boot(block, runtime, container);
    expect(t.emulators[0].destroyed).toBe(true);
    expect(t.emulators[1].destroyed).toBe(false);
  });

  it("destroys an emulator that finishes loading after Stop", async () => {
    let resolve: (emulator: FakeEmulator) => void = () => {};
    const t = setup({ create: () => new Promise((done) => (resolve = done)) });
    const booting = t.machine.boot(block, runtime, container);
    await vi.waitFor(() => expect(t.created).toHaveLength(1));
    await t.machine.stop();
    const late = new FakeEmulator();
    resolve(late);
    await booting;
    expect(late.destroyed).toBe(true);
    expect(t.states.at(-1)).toEqual({ kind: "idle" });
  });

  it("refuses to boot without WebAssembly", async () => {
    const t = setup({ wasm: false });
    await t.machine.boot(block, runtime, container);
    expect(t.created).toHaveLength(0);
    expect(t.states.at(-1)).toEqual({ kind: "error", error: "no-wasm", downloadedMB: 0 });
  });

  it("fits the screen into its area", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    t.machine.fit({ width: 1440, height: 1000 }, { width: 720, height: 400 });
    expect(t.emulators[0].scale).toEqual([2, 2]);
  });

  it("asks the page to fit again when the guest changes its screen size", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    t.emulators[0].emit("screen-set-size", [640, 480, 8]);
    expect(t.resizes.count).toBe(1);
  });

  it("sends Ctrl+Alt+Del", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    t.machine.ctrlAltDel();
    expect(t.emulators[0].scancodes).toEqual(CTRL_ALT_DEL);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/emulator`
Expected: FAIL, "Failed to load url ./fit.ts" (and the same for each module).

- [ ] **Step 3: Write the modules**

`src/emulator/fit.ts`:
```ts
export interface Size {
  width: number;
  height: number;
}

/** The largest scale that fits `content` inside `area` without cropping. */
export function fitScale(area: Size, content: Size): number {
  if (area.width <= 0 || area.height <= 0 || content.width <= 0 || content.height <= 0) return 1;
  return Math.min(area.width / content.width, area.height / content.height);
}
```

`src/emulator/downloads.ts`:
```ts
const MEGABYTE = 1024 * 1024;

/** Adds up bytes downloaded across files; v86 reports progress per file. */
export class DownloadMeter {
  private readonly loaded = new Map<string, number>();

  record(file: string, loaded: number): void {
    this.loaded.set(file, Math.max(loaded, this.loaded.get(file) ?? 0));
  }

  megabytes(): number {
    let total = 0;
    for (const bytes of this.loaded.values()) total += bytes;
    return total / MEGABYTE;
  }
}

/**
 * Detects a download that started but got no new bytes for `timeoutMs`. Only downloads of known
 * length count, so time spent booting with nothing downloading never looks like a stall.
 */
export class StallWatch {
  private readonly active = new Map<string, { loaded: number; at: number }>();
  private readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    this.timeoutMs = timeoutMs;
  }

  progress(file: string, loaded: number, total: number, lengthComputable: boolean, now: number): void {
    if (!lengthComputable || total <= 0) return;
    if (loaded >= total) {
      this.active.delete(file);
      return;
    }
    const entry = this.active.get(file);
    if (!entry || loaded > entry.loaded) this.active.set(file, { loaded, at: now });
  }

  isStalled(now: number): boolean {
    for (const entry of this.active.values()) {
      if (now - entry.at >= this.timeoutMs) return true;
    }
    return false;
  }
}
```

`src/emulator/blank.ts`:
```ts
/** True when fewer than `minFraction` of the RGBA pixels differ from the first pixel. */
export function isBlank(pixels: Uint8ClampedArray, minFraction = 0.0005): boolean {
  const count = Math.floor(pixels.length / 4);
  if (count === 0) return true;
  let different = 0;
  for (let i = 0; i < count * 4; i += 4) {
    if (pixels[i] !== pixels[0] || pixels[i + 1] !== pixels[1] || pixels[i + 2] !== pixels[2]) different++;
  }
  return different / count < minFraction;
}
```

`src/emulator/screen.ts`:
```ts
import type { Size } from "./fit.ts";

export interface ScreenElements {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
}

/** The structure v86's ScreenAdapter expects (v86 examples/basic.html). */
export function createScreen(doc: Document): ScreenElements {
  const container = doc.createElement("div");
  container.className = "v86-screen";
  const text = doc.createElement("div");
  text.style.whiteSpace = "pre";
  text.style.font = "14px monospace";
  text.style.lineHeight = "14px";
  const canvas = doc.createElement("canvas");
  canvas.style.display = "none";
  container.append(text, canvas);
  return { container, canvas };
}

/** With use_graphical_text, v86 draws text mode on the canvas too, so its pixel size is the screen size. */
export function naturalSize(canvas: HTMLCanvasElement): Size {
  return { width: canvas.width, height: canvas.height };
}
```

`src/emulator/machine.ts`:
```ts
import type { V86Block } from "../lib/v86-block.ts";
import { DownloadMeter, StallWatch } from "./downloads.ts";
import { fitScale, type Size } from "./fit.ts";

export type MachineError = "download" | "stalled" | "no-wasm";

export type MachineState =
  | { kind: "idle" }
  | { kind: "running"; downloadedMB: number }
  | { kind: "error"; error: MachineError; downloadedMB: number };

export interface DownloadProgress {
  file_name: string;
  loaded: number;
  total: number;
  lengthComputable: boolean;
}

/** The part of v86's V86 class the machine uses. */
export interface Emulator {
  add_listener(event: "download-progress", listener: (progress: DownloadProgress) => void): void;
  add_listener(event: "download-error" | "screen-set-size", listener: () => void): void;
  screen_set_scale(sx: number, sy: number): void;
  screen_go_fullscreen(): void;
  lock_mouse(): void;
  keyboard_send_scancodes(codes: number[]): void;
  destroy(): Promise<void>;
}

export interface Runtime {
  wasmUrl: string;
  biosUrl: string;
  vgaBiosUrl: string;
}

export interface MachineDeps {
  create(options: Record<string, unknown>): Promise<Emulator>;
  hasWebAssembly(): boolean;
  now(): number;
  /** Calls `fn` every `ms` milliseconds and returns a function that stops it. */
  every(ms: number, fn: () => void): () => void;
  onState(state: MachineState): void;
  /** The guest changed its screen size, so the page should fit the screen again. */
  onScreenSizeChange(): void;
}

/** Ctrl, Alt, Delete, then their break codes (v86 src/browser/main.js). */
export const CTRL_ALT_DEL = [0x1d, 0x38, 0x53, 0x9d, 0xb8, 0xd3];
export const STALL_MS = 60_000;
const STALL_CHECK_MS = 5_000;

/** The exhibit's block, unchanged, plus what the page supplies (spec section 4). */
export function v86Options(block: V86Block, runtime: Runtime, container: HTMLElement): Record<string, unknown> {
  return {
    ...block,
    wasm_path: runtime.wasmUrl,
    bios: { url: runtime.biosUrl },
    vga_bios: { url: runtime.vgaBiosUrl },
    screen: { container, use_graphical_text: true },
    autostart: true,
  };
}

export class Machine {
  private readonly deps: MachineDeps;
  private emulator: Emulator | null = null;
  private stopTimer: (() => void) | null = null;
  private state: MachineState = { kind: "idle" };
  private meter = new DownloadMeter();
  private stall = new StallWatch(STALL_MS);
  private generation = 0;

  constructor(deps: MachineDeps) {
    this.deps = deps;
  }

  async boot(block: V86Block, runtime: Runtime, container: HTMLElement): Promise<void> {
    await this.teardown();
    const generation = this.generation;
    if (!this.deps.hasWebAssembly()) {
      this.setState({ kind: "error", error: "no-wasm", downloadedMB: 0 });
      return;
    }
    this.meter = new DownloadMeter();
    this.stall = new StallWatch(STALL_MS);
    const emulator = await this.deps.create(v86Options(block, runtime, container));
    if (generation !== this.generation) {
      await emulator.destroy();
      return;
    }
    this.emulator = emulator;
    emulator.add_listener("download-progress", (progress) => {
      this.meter.record(progress.file_name, progress.loaded);
      this.stall.progress(progress.file_name, progress.loaded, progress.total, progress.lengthComputable, this.deps.now());
      if (this.state.kind === "running") this.setState({ kind: "running", downloadedMB: this.meter.megabytes() });
    });
    emulator.add_listener("download-error", () => this.fail("download"));
    emulator.add_listener("screen-set-size", () => this.deps.onScreenSizeChange());
    this.stopTimer = this.deps.every(STALL_CHECK_MS, () => {
      if (this.stall.isStalled(this.deps.now())) this.fail("stalled");
    });
    this.setState({ kind: "running", downloadedMB: 0 });
  }

  async stop(): Promise<void> {
    await this.teardown();
    this.setState({ kind: "idle" });
  }

  fit(area: Size, content: Size): void {
    const scale = fitScale(area, content);
    this.emulator?.screen_set_scale(scale, scale);
  }

  fullscreen(): void {
    this.emulator?.screen_go_fullscreen();
  }

  captureMouse(): void {
    this.emulator?.lock_mouse();
  }

  ctrlAltDel(): void {
    this.emulator?.keyboard_send_scancodes(CTRL_ALT_DEL);
  }

  private fail(error: MachineError): void {
    if (this.state.kind !== "running") return;
    this.setState({ kind: "error", error, downloadedMB: this.meter.megabytes() });
  }

  private async teardown(): Promise<void> {
    this.generation++;
    this.stopTimer?.();
    this.stopTimer = null;
    const emulator = this.emulator;
    this.emulator = null;
    if (emulator) await emulator.destroy();
  }

  private setState(state: MachineState): void {
    this.state = state;
    this.deps.onState(state);
  }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/emulator; npm run lint; npm run typecheck`
Expected: all tests PASS; lint and typecheck exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/emulator
git commit -m "feat: add the emulator core: screen fitting, download meter, stall watch and Machine"
```

---

### Task 4: Content collection, exhibit file tools, screenshot script, and the TetrOS exhibit

**Files:**
- Create: `src/content.config.ts`, `scripts/exhibits.ts`, `scripts/exhibits.test.ts`, `scripts/screenshots.ts`, `scripts/screenshots/index.html`, `scripts/screenshots/harness.ts`, `src/content/exhibits/tetros.md`, `src/content/exhibits/screenshots/tetros.png` (generated)
- Modify: `package.json` (`lint` covers `scripts`)

**Interfaces:**
- Consumes: `FAMILY_IDS` (`src/lib/families.ts`), `v86BlockSchema`, `type V86Block` (`src/lib/v86-block.ts`), `Machine`, `type Emulator`, `type MachineState` (`src/emulator/machine.ts`), `createScreen` (`src/emulator/screen.ts`), `isBlank` (`src/emulator/blank.ts`).
- Produces:
  - Collection `exhibits`; `CollectionEntry<"exhibits">` with `id` (the file name) and `data`: `title`, `maker`, `year`, `family`, `license`, `summary`, `downloadEstimateMB`, `screenshotWaitSeconds`, `facts: Record<string, string>`, `tryThis: string[]`, `homepage?`, `screenshot` (image metadata), `sources: string[]`, `v86: V86Block`.
  - `scripts/exhibits.ts`: `interface ExhibitFile { slug; path; data: Record<string, unknown> }`, `readFrontmatter(text: string): Record<string, unknown>`, `setFrontmatterValue(text: string, key: string, value: string | number): string`, `readExhibits(dir: string): Promise<ExhibitFile[]>`, `updateExhibitFile(path: string, values: Record<string, string | number>): Promise<void>`
  - `scripts/screenshots/harness.ts`: `interface HarnessReport { blank: boolean; downloadedMB: number; error: string | null }`; `window.harness.boot(block)`, `window.harness.report()`
  - `npm run screenshots -- [--only=a,b] [--write]`

- [ ] **Step 1: Write the failing exhibit-file tests**

`scripts/exhibits.test.ts`:
```ts
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
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run scripts`
Expected: FAIL, "Failed to load url ./exhibits.ts".

- [ ] **Step 3: Write the exhibit file tools, the collection schema, and the lint change**

`scripts/exhibits.ts`:
```ts
// Reads and edits exhibit Markdown files for the screenshot and health-check scripts.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

export interface ExhibitFile {
  slug: string;
  path: string;
  data: Record<string, unknown>;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/;

export function readFrontmatter(text: string): Record<string, unknown> {
  const match = FRONTMATTER.exec(text);
  if (!match) throw new Error("Missing frontmatter");
  const data: unknown = parse(match[1]);
  if (typeof data !== "object" || data === null) throw new Error("Frontmatter isn't a mapping");
  return data as Record<string, unknown>;
}

/** Sets a top-level key: replaces its line, or adds it before the closing ---. */
export function setFrontmatterValue(text: string, key: string, value: string | number): string {
  const match = FRONTMATTER.exec(text);
  if (!match) throw new Error("Missing frontmatter");
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = match[1].split(/\r?\n/);
  const entry = `${key}: ${value}`;
  const index = lines.findIndex((line) => line.startsWith(`${key}:`));
  if (index >= 0) lines[index] = entry;
  else lines.push(entry);
  return `---${newline}${lines.join(newline)}${newline}---${match[2]}${text.slice(match[0].length)}`;
}

export async function readExhibits(dir: string): Promise<ExhibitFile[]> {
  const names = (await readdir(dir)).filter((name) => name.endsWith(".md")).sort();
  return Promise.all(
    names.map(async (name) => {
      const path = join(dir, name);
      return { slug: name.slice(0, -3), path, data: readFrontmatter(await readFile(path, "utf8")) };
    }),
  );
}

export async function updateExhibitFile(path: string, values: Record<string, string | number>): Promise<void> {
  let text = await readFile(path, "utf8");
  for (const [key, value] of Object.entries(values)) text = setFrontmatterValue(text, key, value);
  await writeFile(path, text);
}
```

`src/content.config.ts`:
```ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { FAMILY_IDS } from "./lib/families.ts";
import { v86BlockSchema } from "./lib/v86-block.ts";

const exhibits = defineCollection({
  loader: glob({ base: "./src/content/exhibits", pattern: "*.md" }),
  schema: ({ image }) =>
    z.strictObject({
      title: z.string().min(1),
      maker: z.string().min(1),
      year: z.number().int().min(1970).max(2030),
      family: z.enum(FAMILY_IDS),
      license: z.enum(["open-source", "proprietary"]),
      summary: z.string().min(1).max(140),
      downloadEstimateMB: z.number().positive(),
      screenshotWaitSeconds: z.number().int().positive().default(120),
      facts: z.record(z.string(), z.string()),
      tryThis: z.array(z.string().min(1)).min(1),
      homepage: z.url().optional(),
      screenshot: image(),
      sources: z.array(z.url()).min(1),
      v86: v86BlockSchema,
    }),
});

export const collections = { exhibits };
```

In `package.json`, change the `lint` script to:
```json
"lint": "oxlint --deny-warnings src scripts",
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run scripts`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the screenshot harness and script**

`scripts/screenshots/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>RetroMuseum screenshot harness</title>
  </head>
  <body style="margin: 0; background: #000">
    <div id="screen"></div>
    <script type="module" src="./harness.ts"></script>
  </body>
</html>
```

`scripts/screenshots/harness.ts`:
```ts
// Boots one exhibit for scripts/screenshots.ts. Vite serves this page; it isn't part of the site.
import { V86 } from "v86";
import wasmUrl from "v86/build/v86.wasm?url";
import { isBlank } from "../../src/emulator/blank.ts";
import { Machine, type Emulator, type MachineState } from "../../src/emulator/machine.ts";
import { createScreen } from "../../src/emulator/screen.ts";
import type { V86Block } from "../../src/lib/v86-block.ts";

export interface HarnessReport {
  blank: boolean;
  downloadedMB: number;
  error: string | null;
}

declare global {
  interface Window {
    harness: { boot(block: V86Block): Promise<void>; report(): HarnessReport };
  }
}

let state: MachineState = { kind: "idle" };
const screen = createScreen(document);
document.getElementById("screen")?.append(screen.container);

const machine = new Machine({
  create: async (options) => new V86(options as ConstructorParameters<typeof V86>[0]) as unknown as Emulator,
  hasWebAssembly: () => typeof WebAssembly === "object",
  now: () => Date.now(),
  every: (ms, fn) => {
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
  },
  onState: (next) => {
    state = next;
  },
  onScreenSizeChange: () => {},
});

window.harness = {
  boot: (block) =>
    machine.boot(block, { wasmUrl, biosUrl: "/bios/seabios.bin", vgaBiosUrl: "/bios/vgabios.bin" }, screen.container),
  report: () => {
    const { canvas } = screen;
    const context = canvas.getContext("2d");
    const blank =
      canvas.width === 0 || canvas.height === 0 || !context || isBlank(context.getImageData(0, 0, canvas.width, canvas.height).data);
    return {
      blank,
      downloadedMB: state.kind === "idle" ? 0 : state.downloadedMB,
      error: state.kind === "error" ? state.error : null,
    };
  },
};
```

`scripts/screenshots.ts`:
```ts
// Boots each exhibit headlessly for its screenshotWaitSeconds (default 120), then reports whether the
// screen is non-blank and how many megabytes it downloaded (spec section 9).
// Usage: npm run screenshots -- [--only=tetros,freedos] [--write]
// --write saves each passing screenshot and sets downloadEstimateMB and screenshot in its file.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { readExhibits, updateExhibitFile } from "./exhibits.ts";
import type { HarnessReport } from "./screenshots/harness.ts";

const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const args = process.argv.slice(2);
const only = args.find((arg) => arg.startsWith("--only="))?.slice("--only=".length).split(",");
const write = args.includes("--write");
const PORT = 5199;

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

let failures = 0;
for (const exhibit of exhibits) {
  const waitSeconds = Number(exhibit.data.screenshotWaitSeconds ?? 120);
  const page = await browser.newPage({ viewport: { width: 1280, height: 1024 } });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => "harness" in window);
  await page.evaluate((block) => window.harness.boot(block as never), exhibit.data.v86);
  await page.waitForTimeout(waitSeconds * 1000);
  const report: HarnessReport = await page.evaluate(() => window.harness.report());
  const megabytes = Math.max(1, Math.ceil(report.downloadedMB));
  const pass = !report.blank && report.error === null;
  if (pass && write) {
    await page.locator("#screen canvas").screenshot({ path: root(`src/content/exhibits/screenshots/${exhibit.slug}.png`) });
    await updateExhibitFile(exhibit.path, { downloadEstimateMB: megabytes, screenshot: `./screenshots/${exhibit.slug}.png` });
  }
  if (!pass) failures++;
  const reason = report.error ?? (report.blank ? "blank screen" : "");
  console.log(`${pass ? "PASS" : "FAIL"}  ${exhibit.slug.padEnd(12)} ${String(megabytes).padStart(5)} MB  ${reason}`);
  await page.close();
}

await browser.close();
await server.close();
console.log(`\n${exhibits.length - failures} of ${exhibits.length} exhibits passed.`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 6: Write the TetrOS exhibit from its sources**

Fetch https://github.com/daniel-e/tetros and https://github.com/daniel-e/tetros/blob/master/README.md. Take the maker, the year (the year of the repository's first commit or release, as shown on GitHub), and every fact in the story from those pages. Write nothing the sources don't say.

Create `src/content/exhibits/tetros.md` (leave out `downloadEstimateMB` and `screenshot`; the screenshot script adds them):
```markdown
---
title: TetrOS
maker: <the author named on the repository>
year: <year of the first release or commit on GitHub>
family: boot-sector
license: open-source
summary: <one sentence, at most 140 characters, from the README>
screenshotWaitSeconds: 30
facts:
  Size: "512 bytes"
  Written in: <language named in the README>
tryThis:
  - <a control from the README, for example which keys move and rotate pieces>
homepage: https://github.com/daniel-e/tetros
sources:
  - https://github.com/daniel-e/tetros
v86:
  fda:
    url: https://i.copy.sh/tetros.img
    size: 512
---

<Two or three short paragraphs: what it is, why it fits in a boot sector, and what that means, from the sources.>
```

Replace every `<…>` with text from the sources before continuing; afterwards `grep -n "<" src/content/exhibits/tetros.md` must print nothing. Quote fact values that look like numbers.

- [ ] **Step 7: Take the TetrOS screenshot**

```bash
npx playwright install chromium
npm run screenshots -- --only=tetros --write
```

Expected: `PASS  tetros           1 MB`, then `1 of 1 exhibits passed.`; `src/content/exhibits/screenshots/tetros.png` exists; `tetros.md` now has `downloadEstimateMB: 1` and `screenshot: ./screenshots/tetros.png`.

Open `src/content/exhibits/screenshots/tetros.png` and check that it shows the TetrOS playfield, not a BIOS message. If it shows a BIOS message, raise `screenshotWaitSeconds` and run the step again.

- [ ] **Step 8: Verify the build validates the exhibit**

Run: `npm run lint; npm run typecheck; npm test; npm run build`
Expected: all exit 0. Then temporarily set `family: bootsector` in `tetros.md`, run `npm run build`, and confirm it fails with a message naming `family`; restore `family: boot-sector`.

- [ ] **Step 9: Commit**

```bash
git add package.json src/content.config.ts scripts/exhibits.ts scripts/exhibits.test.ts scripts/screenshots.ts scripts/screenshots/index.html scripts/screenshots/harness.ts src/content/exhibits/tetros.md src/content/exhibits/screenshots/tetros.png
git commit -m "feat: add the exhibits collection, screenshot script, and the TetrOS exhibit"
```

---

### Task 5: The pages: hall, All exhibits, exhibit page, About

**Files:**
- Create: `src/pages/index.astro`, `src/pages/exhibits/index.astro`, `src/pages/exhibits/[slug].astro`, `src/pages/about.astro`, `src/scripts/hall.ts`, `src/scripts/filter.ts`

**Interfaces:**
- Consumes: `Window.astro`; `byYear`, `COPYRIGHT_LABEL`, `downloadLine` (`src/lib/exhibits.ts`); `familiesPresent`, `familyLabel` (`src/lib/families.ts`); `matchesFilter` (`src/lib/filter.ts`); `stepIndex` (`src/lib/hall.ts`); collection `exhibits`.
- Produces (used by Tasks 6 and 8):
  - Hall ids: `featured-image`, `featured-title`, `featured-maker-year`, `featured-summary`, `visit`, `previous`, `next`, `hall-data` (JSON), strip buttons with `data-hall-index` and `aria-current`.
  - All exhibits: buttons with `data-filter` (`all` or a family id) and `aria-pressed`; cards `li.card[data-family]`.
  - Exhibit page: `section.exhibit-screen[data-estimate-mb][data-base]`, ids `screen-area`, `poster`, `boot`, `no-wasm`, `live`, `machine-toolbar`, `fullscreen`, `capture`, `ctrl-alt-del`, `restart`, `stop`, `progress-bar`, `downloaded`, `error-dialog`, `error-message`, `retry`, `error-stop`, `exhibit-v86` (JSON).

- [ ] **Step 1: Write the hall page and its script**

`src/pages/index.astro`:
```astro
---
import { Image, getImage } from "astro:assets";
import { getCollection } from "astro:content";
import Window from "../layouts/Window.astro";
import { byYear } from "../lib/exhibits.ts";

const base = import.meta.env.BASE_URL;
const exhibits = (await getCollection("exhibits")).sort((a, b) => byYear(a.data, b.data));
const hall = await Promise.all(
  exhibits.map(async (exhibit) => ({
    title: exhibit.data.title,
    makerYear: `${exhibit.data.maker}, ${exhibit.data.year}`,
    summary: exhibit.data.summary,
    href: `${base}exhibits/${exhibit.id}/`,
    image: (await getImage({ src: exhibit.data.screenshot, width: 960 })).src,
    alt: `${exhibit.data.title} running in RetroMuseum`,
  })),
);
const first = hall[0];
---
<Window title="Exhibit hall" description="A museum of operating systems you can boot in your browser." current="hall" image={first?.image}>
  {first && (
    <>
      <section class="hall" aria-label="Featured exhibit">
        <div class="sunken">
          <img id="featured-image" src={first.image} alt={first.alt} width="960" />
        </div>
        <div class="placard" aria-live="polite">
          <h2 id="featured-title">{first.title}</h2>
          <p class="maker-year" id="featured-maker-year">{first.makerYear}</p>
          <p id="featured-summary">{first.summary}</p>
          <a class="bevel-button" id="visit" href={first.href}>Visit exhibit</a>
          <div class="hall-controls">
            <button class="bevel-button" id="previous" type="button">Previous</button>
            <button class="bevel-button" id="next" type="button">Next</button>
          </div>
        </div>
      </section>
      <nav class="strip" aria-label="Every exhibit, oldest first">
        {exhibits.map((exhibit, index) => (
          <button type="button" data-hall-index={index} aria-current={index === 0 ? "true" : "false"}>
            <Image src={exhibit.data.screenshot} alt="" width={240} />
            {exhibit.data.title} ({exhibit.data.year})
          </button>
        ))}
      </nav>
      <script type="application/json" id="hall-data" set:html={JSON.stringify(hall)}></script>
    </>
  )}
</Window>
<script>
  import "../scripts/hall.ts";
</script>
```

`src/scripts/hall.ts`:
```ts
import { stepIndex } from "../lib/hall.ts";

interface HallItem {
  title: string;
  makerYear: string;
  summary: string;
  href: string;
  image: string;
  alt: string;
}

const data = document.getElementById("hall-data");
if (data) {
  const items = JSON.parse(data.textContent ?? "[]") as HallItem[];
  const image = document.getElementById("featured-image") as HTMLImageElement;
  const title = document.getElementById("featured-title") as HTMLElement;
  const makerYear = document.getElementById("featured-maker-year") as HTMLElement;
  const summary = document.getElementById("featured-summary") as HTMLElement;
  const visit = document.getElementById("visit") as HTMLAnchorElement;
  const strip = [...document.querySelectorAll<HTMLButtonElement>("[data-hall-index]")];
  let index = 0;

  const show = (next: number) => {
    index = stepIndex(next, 0, items.length);
    const item = items[index];
    image.src = item.image;
    image.alt = item.alt;
    title.textContent = item.title;
    makerYear.textContent = item.makerYear;
    summary.textContent = item.summary;
    visit.href = item.href;
    for (const button of strip) button.setAttribute("aria-current", String(Number(button.dataset.hallIndex) === index));
    strip[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  document.getElementById("previous")?.addEventListener("click", () => show(index - 1));
  document.getElementById("next")?.addEventListener("click", () => show(index + 1));
  for (const button of strip) button.addEventListener("click", () => show(Number(button.dataset.hallIndex)));
}
```

- [ ] **Step 2: Write the All exhibits page and its script**

`src/pages/exhibits/index.astro`:
```astro
---
import { Image } from "astro:assets";
import { getCollection } from "astro:content";
import Window from "../../layouts/Window.astro";
import { byYear } from "../../lib/exhibits.ts";
import { familiesPresent, familyLabel } from "../../lib/families.ts";

const base = import.meta.env.BASE_URL;
const exhibits = (await getCollection("exhibits")).sort((a, b) => byYear(a.data, b.data));
const families = familiesPresent(exhibits.map((exhibit) => exhibit.data.family));
---
<Window title="All exhibits" description="Every operating system in RetroMuseum, by family." current="exhibits">
  <div class="filter" role="group" aria-label="Filter by family">
    <button class="bevel-button" type="button" data-filter="all" aria-pressed="true">All</button>
    {families.map((family) => (
      <button class="bevel-button" type="button" data-filter={family} aria-pressed="false">{familyLabel(family)}</button>
    ))}
  </div>
  <ul class="grid">
    {exhibits.map((exhibit) => (
      <li class="card" data-family={exhibit.data.family}>
        <a href={`${base}exhibits/${exhibit.id}/`}>
          <Image src={exhibit.data.screenshot} alt="" width={480} />
          <h2>{exhibit.data.title}</h2>
          <p>{exhibit.data.maker}, {exhibit.data.year}</p>
          <p>{familyLabel(exhibit.data.family)}</p>
        </a>
      </li>
    ))}
  </ul>
</Window>
<script>
  import "../../scripts/filter.ts";
</script>
```

`src/scripts/filter.ts`:
```ts
import { matchesFilter } from "../lib/filter.ts";

const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-filter]")];
const cards = [...document.querySelectorAll<HTMLElement>("[data-family]")];

for (const button of buttons) {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter ?? "all";
    for (const other of buttons) other.setAttribute("aria-pressed", String(other === button));
    for (const card of cards) card.hidden = !matchesFilter(card.dataset.family ?? "", filter);
  });
}
```

- [ ] **Step 3: Write the exhibit page**

`src/pages/exhibits/[slug].astro`:
```astro
---
import { Image, getImage } from "astro:assets";
import { getCollection, render, type CollectionEntry } from "astro:content";
import Window from "../../layouts/Window.astro";
import { COPYRIGHT_LABEL, downloadLine } from "../../lib/exhibits.ts";
import { familyLabel } from "../../lib/families.ts";

export async function getStaticPaths() {
  const exhibits = await getCollection("exhibits");
  return exhibits.map((exhibit) => ({ params: { slug: exhibit.id }, props: { exhibit } }));
}

interface Props {
  exhibit: CollectionEntry<"exhibits">;
}

const { exhibit } = Astro.props;
const { data } = exhibit;
const { Content } = await render(exhibit);
const preview = await getImage({ src: data.screenshot, width: 1200, format: "png" });
const base = import.meta.env.BASE_URL;
---
<Window title={data.title} description={data.summary} current="exhibits" image={preview.src}>
  <section class="exhibit-screen" data-estimate-mb={data.downloadEstimateMB} data-base={base}>
    <div class="screen-area sunken" id="screen-area">
      <div class="poster" id="poster">
        <Image src={data.screenshot} alt={`${data.title} screenshot`} width={1024} loading="eager" />
        <div class="poster-overlay">
          <button class="bevel-button boot-button" id="boot" type="button">Boot it</button>
          <p class="download-line">{downloadLine(data.downloadEstimateMB)}</p>
          <p class="touch-note">Best with a keyboard and mouse</p>
          <p id="no-wasm" hidden>This exhibit can't run in this browser: it needs WebAssembly, which this browser doesn't support.</p>
        </div>
      </div>
      <div class="live" id="live" hidden></div>
    </div>
    <div class="machine-toolbar" id="machine-toolbar" hidden>
      <button class="bevel-button" id="fullscreen" type="button">Full screen</button>
      <button class="bevel-button" id="capture" type="button">Capture mouse</button>
      <button class="bevel-button" id="ctrl-alt-del" type="button">Ctrl+Alt+Del</button>
      <button class="bevel-button" id="restart" type="button">Restart</button>
      <button class="bevel-button" id="stop" type="button">Stop</button>
      <div class="progress" aria-hidden="true"><div id="progress-bar"></div></div>
      <span id="downloaded" aria-live="polite"></span>
      <span class="hint">Press Esc to release the mouse.</span>
    </div>
    <dialog id="error-dialog" aria-labelledby="error-title">
      <div class="title-bar" id="error-title">Disk image server</div>
      <p class="dialog-body" id="error-message">Couldn't reach the disk image server (i.copy.sh). It may be busy; try again in a minute.</p>
      <div class="dialog-actions">
        <button class="bevel-button" id="retry" type="button">Retry</button>
        <button class="bevel-button" id="error-stop" type="button">Stop</button>
      </div>
    </dialog>
    <script type="application/json" id="exhibit-v86" set:html={JSON.stringify(data.v86)}></script>
  </section>
  {data.license === "proprietary" && <p class="copyright">{COPYRIGHT_LABEL}</p>}
  <div class="exhibit-body">
    <article class="story">
      <p class="maker-year">{data.maker}, {data.year}. {familyLabel(data.family)}.</p>
      <Content />
    </article>
    <aside>
      <h2>Facts</h2>
      <dl class="facts">
        {Object.entries(data.facts).map(([name, value]) => (
          <>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </>
        ))}
      </dl>
      <h2>Things to try</h2>
      <ul>
        {data.tryThis.map((item) => <li>{item}</li>)}
      </ul>
      <h2>Sources</h2>
      <ol>
        {data.sources.map((source) => <li><a href={source}>{new URL(source).hostname}</a></li>)}
      </ol>
      {data.homepage && <p><a href={data.homepage}>Project homepage</a></p>}
    </aside>
  </div>
</Window>
```

- [ ] **Step 4: Write the About page**

`src/pages/about.astro`:
```astro
---
import Window from "../layouts/Window.astro";

const repo = import.meta.env.BASE_URL.replaceAll("/", "");
const repoUrl = `https://github.com/hammadshakeelai/${repo}`;
---
<Window
  title="About"
  description="What RetroMuseum is, the software it runs on, and how to ask for an exhibit to be removed."
  current="about"
>
  <article class="story">
    <h2>What this is</h2>
    <p>RetroMuseum is a museum of operating systems you can boot in your browser. Each exhibit is a real operating system running in an emulated PC, with its story, its facts, and things to try.</p>
    <p>Nothing is installed on your computer. When you press <strong>Boot it</strong>, the emulator starts in the page and downloads the exhibit's disk image as the system reads it.</p>

    <h2>Credits</h2>
    <p>Every exhibit runs in <a href="https://github.com/copy/v86">v86</a>, an x86 PC emulator by the v86 contributors. The disk images and snapshots load from <a href="https://copy.sh/v86/">copy.sh</a>, the v86 project's server, as they do on v86's own site.</p>

    <h2>Licenses</h2>
    <ul>
      <li>RetroMuseum's own code: MIT.</li>
      <li>v86: BSD-2-Clause.</li>
      <li>SeaBIOS and SeaVGABIOS: GNU LGPL v3.</li>
      <li>Each operating system keeps its own license. Some exhibits are copyrighted software, shown for their history. Their disk images aren't hosted on this site and can't be downloaded from it.</li>
    </ul>

    <h2>Asking for an exhibit to be removed</h2>
    <p>If you hold rights to software shown here and want its exhibit removed, <a href={`${repoUrl}/issues/new?template=removal-request.yml`}>open a removal request</a>. A valid request is handled by deleting that exhibit.</p>
    <p>The source code is on <a href={repoUrl}>GitHub</a>.</p>
  </article>
</Window>
```

- [ ] **Step 5: Build and look at every page**

Run: `npm run lint; npm run typecheck; npm test; npm run build`
Expected: all exit 0; `dist/index.html`, `dist/exhibits/index.html`, `dist/exhibits/tetros/index.html`, `dist/about/index.html`, `dist/404.html` exist.

Add a `retromuseum-preview` entry to `C:\Users\HP\Documents\GitHub\WebOS\.claude\launch.json` (untracked; `runtimeExecutable` `npm`, `runtimeArgs` `["run", "preview"]`, `port` 4321), start it with the Browser pane's `preview_start`, and open `http://localhost:4321/RetroMuseum/`. Check at 1280 px and at the `mobile` preset:
- the hall shows TetrOS with its placard, and **Next**/**Previous** keep working with one exhibit;
- `exhibits/` shows the TetrOS card and the **Boot-sector** filter hides nothing;
- `exhibits/tetros/` shows the poster, **Boot it**, the download line, facts, things to try, and sources, and no copyright label;
- `about/` and a missing page (`exhibits/nope/`) render.

Stop the preview server afterwards.

- [ ] **Step 6: Commit**

```bash
git add src/pages src/scripts/hall.ts src/scripts/filter.ts
git commit -m "feat: add the exhibit hall, All exhibits, exhibit and About pages"
```

---

### Task 6: Booting on the exhibit page

**Files:**
- Create: `src/scripts/exhibit-page.ts`
- Modify: `src/pages/exhibits/[slug].astro` (load the script)

**Interfaces:**
- Consumes: `Machine`, `type Emulator`, `type MachineState` (`src/emulator/machine.ts`); `createScreen`, `naturalSize` (`src/emulator/screen.ts`); `type V86Block`; the exhibit page ids from Task 5.

- [ ] **Step 1: Write the page script**

`src/scripts/exhibit-page.ts`:
```ts
import wasmUrl from "v86/build/v86.wasm?url";
import { Machine, type Emulator, type MachineState } from "../emulator/machine.ts";
import { createScreen, naturalSize, type ScreenElements } from "../emulator/screen.ts";
import type { V86Block } from "../lib/v86-block.ts";

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id}`);
  return found as T;
}

const section = document.querySelector<HTMLElement>(".exhibit-screen");
if (section) {
  const block = JSON.parse(element("exhibit-v86").textContent ?? "{}") as V86Block;
  const estimateMB = Number(section.dataset.estimateMb);
  const base = section.dataset.base ?? "/";
  const area = element("screen-area");
  const poster = element("poster");
  const live = element("live");
  const toolbar = element("machine-toolbar");
  const progressBar = element("progress-bar");
  const downloaded = element("downloaded");
  const dialog = element<HTMLDialogElement>("error-dialog");
  const errorStop = element<HTMLButtonElement>("error-stop");
  const bootButton = element<HTMLButtonElement>("boot");
  const noWasm = element("no-wasm");
  let screen: ScreenElements = createScreen(document);

  const fit = () => {
    const fullscreen = document.fullscreenElement === screen.container;
    const rect = area.getBoundingClientRect();
    const size = fullscreen ? { width: innerWidth, height: innerHeight } : { width: rect.width, height: rect.height };
    machine.fit(size, naturalSize(screen.canvas));
  };

  const render = (state: MachineState) => {
    if (state.kind === "error" && state.error === "no-wasm") {
      bootButton.hidden = true;
      noWasm.hidden = false;
      return;
    }
    const active = state.kind !== "idle";
    poster.hidden = active;
    live.hidden = !active;
    toolbar.hidden = !active;
    if (state.kind === "idle") {
      screen.container.remove();
      if (dialog.open) dialog.close();
      return;
    }
    downloaded.textContent = `${Math.round(state.downloadedMB)} MB downloaded`;
    progressBar.style.width = `${Math.min(100, (state.downloadedMB / estimateMB) * 100)}%`;
    if (state.kind === "error") {
      errorStop.hidden = state.error !== "stalled";
      if (!dialog.open) dialog.showModal();
    }
  };

  const machine = new Machine({
    create: async (options) => {
      const { V86 } = await import("v86");
      return new V86(options as ConstructorParameters<typeof V86>[0]) as unknown as Emulator;
    },
    hasWebAssembly: () => typeof WebAssembly === "object",
    now: () => Date.now(),
    every: (ms, fn) => {
      const id = setInterval(fn, ms);
      return () => clearInterval(id);
    },
    onState: render,
    onScreenSizeChange: () => requestAnimationFrame(fit),
  });

  const boot = async () => {
    if (dialog.open) dialog.close();
    screen.container.remove();
    screen = createScreen(document);
    live.append(screen.container);
    await machine.boot(block, { wasmUrl, biosUrl: `${base}bios/seabios.bin`, vgaBiosUrl: `${base}bios/vgabios.bin` }, screen.container);
  };

  bootButton.addEventListener("click", () => void boot());
  element("retry").addEventListener("click", () => void boot());
  element("restart").addEventListener("click", () => void boot());
  element("stop").addEventListener("click", () => void machine.stop());
  errorStop.addEventListener("click", () => void machine.stop());
  element("fullscreen").addEventListener("click", () => machine.fullscreen());
  element("capture").addEventListener("click", () => machine.captureMouse());
  element("ctrl-alt-del").addEventListener("click", () => machine.ctrlAltDel());
  live.addEventListener("click", () => machine.captureMouse());
  new ResizeObserver(() => fit()).observe(area);
  document.addEventListener("fullscreenchange", () => requestAnimationFrame(fit));
  addEventListener("pagehide", () => void machine.stop());
}
```

- [ ] **Step 2: Load it on the exhibit page**

At the end of `src/pages/exhibits/[slug].astro`, after `</Window>`, add:
```astro
<script>
  import "../../scripts/exhibit-page.ts";
</script>
```

- [ ] **Step 3: Verify in the browser**

Run: `npm run lint; npm run typecheck; npm test; npm run build`
Expected: all exit 0. `ls dist/_astro` shows a separate chunk containing v86 (the largest `.js` file) and a `v86.*.wasm` file.

Start the `retromuseum-preview` server and open `http://localhost:4321/RetroMuseum/exhibits/tetros/` in the Browser pane:
1. The network panel (`read_network_requests`) shows no `v86` chunk or `.wasm` request before pressing anything.
2. Press **Boot it**: the poster is replaced by the live screen scaled to fill the area without cropping, the toolbar appears, and "1 MB downloaded" shows.
3. Resize the viewport to `mobile`: the screen shrinks and stays whole.
4. **Ctrl+Alt+Del** restarts TetrOS; **Restart** boots it again; **Stop** brings back the poster and **Boot it**.
5. `read_console_messages` with `onlyErrors: true` shows no errors.

Stop the preview server.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/exhibit-page.ts src/pages/exhibits/[slug].astro
git commit -m "feat: boot exhibits on their page with progress, errors and the machine toolbar"
```

---

### Task 7: The first nine exhibits

**Files:**
- Create: `src/content/exhibits/{sectorlisp,floppybird,bootchess,freedos,kolibrios,helenos,windows1,elks}.md` and their screenshots

**Interfaces:**
- Consumes: the collection schema (Task 4), `npm run screenshots` (Task 4).

Every exhibit file follows the TetrOS pattern from Task 4 Step 6. For each exhibit:
1. Fetch its sources (the URLs below, and any page they cite for a fact you use).
2. Write `maker`, `year` (the release year of the version in the disk image), `summary` (one sentence, at most 140 characters), `facts` (two to four entries with display-style labels such as `Released`, `Boot media`, `Memory here`; quote values that look like numbers), `tryThis` (two to four things you confirm on the running exhibit), and a story of two to four short paragraphs. Every claim comes from a listed source. No marketing language.
3. Copy the v86 block and the other settings exactly as given.
4. Leave out `downloadEstimateMB` and `screenshot`; the screenshot script adds them.

- [ ] **Step 1: Write the eight files with these exact settings**

`sectorlisp.md`:
```yaml
title: SectorLISP
family: boot-sector
license: open-source
screenshotWaitSeconds: 30
homepage: https://justine.lol/sectorlisp2/
sources:
  - https://justine.lol/sectorlisp2/
  - https://github.com/jart/sectorlisp
v86:
  fda:
    url: https://i.copy.sh/sectorlisp-friendly.bin
    size: 512
```

`floppybird.md`:
```yaml
title: Floppy Bird
family: boot-sector
license: open-source
screenshotWaitSeconds: 30
homepage: http://mihail.co/floppybird
sources:
  - http://mihail.co/floppybird
  - https://github.com/icebreaker/floppybird
v86:
  fda:
    url: https://i.copy.sh/floppybird.img
    size: 1474560
```

`bootchess.md`:
```yaml
title: BootChess
family: boot-sector
license: open-source
screenshotWaitSeconds: 30
homepage: https://www.pouet.net/prod.php?which=64962
sources:
  - https://www.pouet.net/prod.php?which=64962
v86:
  fda:
    url: https://i.copy.sh/bootchess.img
    size: 1474560
```

`freedos.md`:
```yaml
title: FreeDOS
family: dos
license: open-source
screenshotWaitSeconds: 60
homepage: https://www.freedos.org/
sources:
  - https://en.wikipedia.org/wiki/FreeDOS
  - https://www.freedos.org/
v86:
  fda:
    url: https://i.copy.sh/freedos722.img
    size: 737280
```

`kolibrios.md`:
```yaml
title: KolibriOS
family: independent
license: open-source
screenshotWaitSeconds: 60
homepage: https://kolibrios.org/en/
sources:
  - https://en.wikipedia.org/wiki/KolibriOS
  - https://kolibrios.org/en/
v86:
  fda:
    url: https://i.copy.sh/kolibri.img
    size: 1474560
```

`helenos.md`:
```yaml
title: HelenOS
family: independent
license: open-source
screenshotWaitSeconds: 120
homepage: http://www.helenos.org/
sources:
  - https://en.wikipedia.org/wiki/HelenOS
  - http://www.helenos.org/
v86:
  memory_size: 268435456
  cdrom:
    url: https://i.copy.sh/HelenOS-0.14.1-ia32.iso
    size: 25792512
    async: false
```

`windows1.md`:
```yaml
title: Windows 1.01
family: windows
license: proprietary
screenshotWaitSeconds: 60
sources:
  - https://en.wikipedia.org/wiki/Windows_1.0
v86:
  fda:
    url: https://i.copy.sh/windows101.img
    size: 1474560
```

`elks.md`:
```yaml
title: ELKS
family: unix-bsd-linux
license: open-source
screenshotWaitSeconds: 90
homepage: https://github.com/ghaerr/elks
sources:
  - https://en.wikipedia.org/wiki/Embeddable_Linux_Kernel_Subset
  - https://github.com/ghaerr/elks
v86:
  hda:
    url: https://i.copy.sh/elks-hd32-fat.img
    size: 32514048
    async: false
```

If a source URL doesn't load, find the page it refers to and use that address instead.

- [ ] **Step 2: Take the screenshots**

Run (in the background; about 8 minutes): `npm run screenshots -- --only=sectorlisp,floppybird,bootchess,freedos,kolibrios,helenos,windows1,elks --write`
Expected: one `PASS` or `FAIL` line per exhibit and a final count.

For each PASS, open its PNG and check it shows the exhibit's own screen (a prompt, desktop, or game), not a BIOS or boot-loader message. If it shows an earlier stage, raise that exhibit's `screenshotWaitSeconds` and run it again with `--only=<slug> --write`.

For a FAIL, run it once more with a longer wait. If it still fails, delete its Markdown file; spec section 5 leaves failing exhibits out. Write down each left-out exhibit and the reason for the pull request description.

- [ ] **Step 3: Confirm the things to try**

Start the preview server, boot each included exhibit, and try every `tryThis` entry. Replace any entry that doesn't work as written.

- [ ] **Step 4: Verify and commit**

Run: `npm run lint; npm run typecheck; npm test; npm run build`
Expected: all exit 0. `grep -rn "<" src/content/exhibits/*.md` prints no angle-bracket prompts.

```bash
git add src/content/exhibits
git commit -m "feat: add the first exhibits: boot-sector programs, FreeDOS, KolibriOS, HelenOS, Windows 1.01 and ELKS"
```

---

### Task 8: End-to-end tests

**Files:**
- Create: `playwright.config.ts`, `e2e/site.spec.ts`
- Modify: `package.json` (`lint` covers `e2e`), `.github/workflows/ci.yml` (run the end-to-end tests)

**Interfaces:**
- Consumes: the page ids and texts from Tasks 5 and 6; exhibits `tetros` (boot-sector), `freedos` (dos), `windows1` (proprietary). If Task 7 left out `freedos` or `windows1`, use another included DOS or proprietary exhibit in these tests.

- [ ] **Step 1: Write the Playwright config and tests**

`playwright.config.ts`:
```ts
import { defineConfig, devices } from "@playwright/test";

const base = process.env.BASE_PATH ?? "/RetroMuseum/";

export default defineConfig({
  testDir: "e2e",
  timeout: 5 * 60_000,
  use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:4321${base}` },
  webServer: {
    command: "npm run preview",
    url: `http://localhost:4321${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

`e2e/site.spec.ts`:
```ts
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

test("copyrighted exhibits say where their disk image comes from", async ({ page }) => {
  await page.goto("exhibits/windows1/");
  await expect(
    page.getByText("Copyrighted software, shown for its history. The disk image loads from copy.sh, the v86 project's server."),
  ).toBeVisible();
});

test("an unknown page shows File not found", async ({ page }) => {
  await page.goto("exhibits/not-an-exhibit/");
  await expect(page.getByText("The page you asked for isn't in the collection.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the exhibit hall" })).toBeVisible();
});

test("Boot it runs TetrOS, and Stop brings back the poster", async ({ page }) => {
  await page.goto("exhibits/tetros/");
  await page.getByRole("button", { name: "Boot it" }).click();
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const canvas = document.querySelector<HTMLCanvasElement>(".v86-screen canvas");
          if (!canvas || canvas.width === 0) return 0;
          const pixels = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
          if (!pixels) return 0;
          let lit = 0;
          for (let i = 0; i < pixels.length; i += 4) if (pixels[i] || pixels[i + 1] || pixels[i + 2]) lit++;
          return lit;
        }),
      { timeout: 120_000 },
    )
    .toBeGreaterThan(1000);
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByRole("button", { name: "Boot it" })).toBeVisible();
});
```

In `package.json`, change the `lint` script to:
```json
"lint": "oxlint --deny-warnings src scripts e2e",
```

In `.github/workflows/ci.yml`, append after `- run: npm run build`:
```yaml
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

- [ ] **Step 2: Run the tests**

Run: `npm run build; npm run test:e2e`
Expected: 6 passed. If "an unknown page shows File not found" fails because `astro preview` doesn't serve `404.html`, check `dist/404.html` exists and confirm with `curl -s http://localhost:4321/RetroMuseum/nope/` during a preview; GitHub Pages serves `404.html` for missing pages, so adjust only the test's navigation, not the page.

- [ ] **Step 3: Verify and commit**

Run: `npm run lint; npm run typecheck; npm test`
Expected: all exit 0.

```bash
git add playwright.config.ts e2e/site.spec.ts package.json .github/workflows/ci.yml
git commit -m "test: add end-to-end tests for the hall, filter, exhibit pages and booting TetrOS"
```

---

### Task 9: Weekly exhibit health check and the removal-request template

**Files:**
- Create: `scripts/exhibit-health.ts`, `scripts/exhibit-health.test.ts`, `.github/workflows/exhibit-health.yml`, `.github/ISSUE_TEMPLATE/removal-request.yml`

**Interfaces:**
- Consumes: `exhibitUrls` (`src/lib/parts.ts`), `type V86Block`, `readExhibits` (`scripts/exhibits.ts`).
- Produces: `type Fetcher = (url: string, init: RequestInit) => Promise<Response>`, `probe(url: string, fetcher?: Fetcher): Promise<string | null>`, `checkExhibits(dir: string, fetcher?: Fetcher): Promise<string[]>`; `exhibit-health.md` when something is broken.

- [ ] **Step 1: Write the failing tests**

`scripts/exhibit-health.test.ts`:
```ts
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkExhibits, probe } from "./exhibit-health.ts";

const CORS = { "access-control-allow-origin": "*" };
const reply = (status: number, headers: Record<string, string> = CORS) => new Response(null, { status, headers });

describe("probe", () => {
  it("accepts 200 and 206 with an open CORS header", async () => {
    expect(await probe("https://i.copy.sh/a.img", async () => reply(206))).toBeNull();
    expect(await probe("https://i.copy.sh/a.img", async () => reply(200))).toBeNull();
  });

  it("reports a failed status", async () => {
    expect(await probe("https://i.copy.sh/a.img", async () => reply(404))).toBe("HTTP 404");
  });

  it("reports a missing CORS header", async () => {
    expect(await probe("https://i.copy.sh/a.img", async () => reply(206, {}))).toBe("no Access-Control-Allow-Origin: * header");
  });

  it("reports a network error", async () => {
    expect(
      await probe("https://i.copy.sh/a.img", async () => {
        throw new Error("fetch failed");
      }),
    ).toBe("fetch failed");
  });

  it("asks for a small range from the site's origin", async () => {
    let init: RequestInit | undefined;
    await probe("https://i.copy.sh/a.img", async (_url, options) => {
      init = options;
      return reply(206);
    });
    expect(init?.headers).toEqual({ Origin: "https://hammadshakeelai.github.io", Range: "bytes=0-1023" });
  });
});

describe("checkExhibits", () => {
  it("checks the first part of split images and the snapshot", async () => {
    const dir = await mkdtemp(join(tmpdir(), "exhibits-"));
    await writeFile(
      join(dir, "haiku.md"),
      "---\ntitle: Haiku\nv86:\n  hda:\n    url: https://i.copy.sh/haiku-v5/.img\n    use_parts: true\n    fixed_chunk_size: 1048576\n  initial_state:\n    url: https://i.copy.sh/haiku_state-v5.bin.zst\n---\n",
    );
    const requested: string[] = [];
    const problems = await checkExhibits(dir, async (url) => {
      requested.push(url);
      return url.endsWith(".zst") ? reply(404) : reply(206);
    });
    expect(requested).toEqual(["https://i.copy.sh/haiku-v5/0-1048576.img", "https://i.copy.sh/haiku_state-v5.bin.zst"]);
    expect(problems).toEqual(["- **haiku**: https://i.copy.sh/haiku_state-v5.bin.zst (HTTP 404)"]);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run scripts/exhibit-health.test.ts`
Expected: FAIL, "Failed to load url ./exhibit-health.ts".

- [ ] **Step 3: Write the script, workflow, and issue template**

`scripts/exhibit-health.ts`:
```ts
// Weekly check (.github/workflows/exhibit-health.yml): requests the first bytes of every URL each
// exhibit needs to start, as a browser on the site would. Writes exhibit-health.md and exits 1 if
// any exhibit is broken.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { exhibitUrls } from "../src/lib/parts.ts";
import type { V86Block } from "../src/lib/v86-block.ts";
import { readExhibits } from "./exhibits.ts";

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** Null when the URL works from the site; otherwise what went wrong. */
export async function probe(url: string, fetcher: Fetcher = fetch): Promise<string | null> {
  try {
    const response = await fetcher(url, {
      headers: { Origin: "https://hammadshakeelai.github.io", Range: "bytes=0-1023" },
      signal: AbortSignal.timeout(30_000),
    });
    await response.body?.cancel();
    if (response.status !== 200 && response.status !== 206) return `HTTP ${response.status}`;
    if (response.headers.get("access-control-allow-origin") !== "*") return "no Access-Control-Allow-Origin: * header";
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export async function checkExhibits(dir: string, fetcher: Fetcher = fetch): Promise<string[]> {
  const problems: string[] = [];
  for (const exhibit of await readExhibits(dir)) {
    for (const url of exhibitUrls(exhibit.data.v86 as V86Block)) {
      const problem = await probe(url, fetcher);
      if (problem) problems.push(`- **${exhibit.slug}**: ${url} (${problem})`);
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = await checkExhibits(fileURLToPath(new URL("../src/content/exhibits", import.meta.url)));
  if (problems.length === 0) {
    console.log("Every exhibit's disk images and snapshots load from i.copy.sh.");
  } else {
    const report = [
      "These exhibits can't start because a disk image or snapshot didn't load from i.copy.sh:",
      "",
      ...problems,
      "",
      "If one stays broken, remove that exhibit's Markdown file and screenshot.",
      "",
    ].join("\n");
    await writeFile("exhibit-health.md", report);
    console.log(report);
    process.exit(1);
  }
}
```

`.github/workflows/exhibit-health.yml`:
```yaml
name: Exhibit health

on:
  schedule:
    - cron: "0 6 * * 1"
  workflow_dispatch:

permissions:
  contents: read
  issues: write

jobs:
  check:
    name: Check exhibit disk images
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm

      - run: npm ci

      - name: Request every exhibit's disk images
        id: health
        continue-on-error: true
        run: node scripts/exhibit-health.ts

      - name: Open or update an issue
        if: steps.health.outcome == 'failure'
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh label create exhibit-health --color d93f0b --description "Exhibit disk images that don't load" 2>/dev/null || true
          number=$(gh issue list --label exhibit-health --state open --json number --jq '.[0].number')
          if [ -n "$number" ]; then
            gh issue comment "$number" --body-file exhibit-health.md
          else
            gh issue create --title "Exhibit disk images don't load" --label exhibit-health --body-file exhibit-health.md
          fi

      - name: Fail the run
        if: steps.health.outcome == 'failure'
        run: exit 1
```

`.github/ISSUE_TEMPLATE/removal-request.yml`:
```yaml
name: Removal request
description: Ask for an exhibit to be removed from RetroMuseum.
title: "Removal request: "
labels: ["removal-request"]
body:
  - type: markdown
    attributes:
      value: Use this form if you hold rights to software shown in RetroMuseum and want its exhibit removed. A valid request is handled by deleting that exhibit.
  - type: input
    id: exhibit
    attributes:
      label: Exhibit
      description: The exhibit's name or the address of its page.
    validations:
      required: true
  - type: textarea
    id: rights
    attributes:
      label: Your connection to the software
      description: For example, you hold its copyright or act for the holder.
    validations:
      required: true
  - type: textarea
    id: details
    attributes:
      label: Anything else we should know
```

- [ ] **Step 4: Run the tests and the real check**

Run: `npx vitest run scripts; npm run lint; npm run typecheck; npm run health`
Expected: tests PASS; lint and typecheck exit 0; `npm run health` prints "Every exhibit's disk images and snapshots load from i.copy.sh." and exits 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/exhibit-health.ts scripts/exhibit-health.test.ts .github/workflows/exhibit-health.yml .github/ISSUE_TEMPLATE/removal-request.yml
git commit -m "feat: add the weekly exhibit health check and the removal-request template"
```

---

### Task 10: README, notices, banner; open the pull request, merge, and check the site at /WebOS/

**Files:**
- Create: `docs/banner.html`, `docs/banner.png`, `docs/screenshots/hall.png`, `docs/screenshots/exhibit.png`, `scripts/readme-images.ts`
- Modify: `README.md` (rewritten), `THIRD_PARTY_NOTICES.md` (rewritten)

**Interfaces:**
- Consumes: the built site; exhibit `kolibrios` for the running screenshot (use another included graphical exhibit if Task 7 left it out).

- [ ] **Step 1: Write the banner and the README image script**

`docs/banner.html`:
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; width: 1280px; height: 320px; background: #d9d2c0; font-family: Tahoma, Verdana, sans-serif; }
  .window { position: absolute; left: 40px; top: 36px; width: 1200px; height: 248px; background: #c9c1ad; border: 3px solid; border-color: #f4efe2 #8a8472 #8a8472 #f4efe2; }
  .title { background: linear-gradient(90deg, #000080, #1084d0); color: #fff; font-weight: bold; font-size: 22px; padding: 8px 14px; }
  .body { display: flex; gap: 28px; padding: 18px 22px; align-items: flex-start; }
  .copy h1 { margin: 0; font-size: 56px; color: #1d1d1d; letter-spacing: -0.01em; }
  .copy p { margin: 10px 0 0; font-size: 22px; color: #3d3a30; max-width: 500px; }
  .shelf { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .exhibit { background: #f4efe2; border: 1px solid #8a8472; padding: 8px 10px; font-size: 16px; color: #3d3a30; }
  .exhibit b { display: block; font-size: 18px; color: #1d1d1d; }
</style>
</head>
<body>
  <div class="window">
    <div class="title">RetroMuseum: Exhibit hall</div>
    <div class="body">
      <div class="copy">
        <h1>RetroMuseum</h1>
        <p>Operating systems you can boot in your browser, with their stories.</p>
      </div>
      <div class="shelf">
        <div class="exhibit"><b>Windows 1.01</b>1985</div>
        <div class="exhibit"><b>FreeDOS</b>DOS</div>
        <div class="exhibit"><b>KolibriOS</b>On one floppy</div>
        <div class="exhibit"><b>HelenOS</b>Microkernel</div>
        <div class="exhibit"><b>ELKS</b>Linux for the 8086</div>
        <div class="exhibit"><b>TetrOS</b>512 bytes</div>
      </div>
    </div>
  </div>
</body>
</html>
```

`scripts/readme-images.ts`:
```ts
// Renders docs/banner.png and captures the README screenshots from a running preview
// (npm run build && npm run preview first).
import { chromium } from "@playwright/test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const site = `http://localhost:4321${process.env.BASE_PATH ?? "/RetroMuseum/"}`;
const browser = await chromium.launch();

const banner = await browser.newPage({ viewport: { width: 1280, height: 320 }, deviceScaleFactor: 2 });
await banner.goto(pathToFileURL(root("docs/banner.html")).href);
await banner.screenshot({ path: root("docs/banner.png") });

const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
await page.goto(site);
await page.screenshot({ path: root("docs/screenshots/hall.png") });
await page.goto(`${site}exhibits/kolibrios/`);
await page.getByRole("button", { name: "Boot it" }).click();
await page.waitForTimeout(45_000);
await page.screenshot({ path: root("docs/screenshots/exhibit.png") });

await browser.close();
console.log("Wrote docs/banner.png, docs/screenshots/hall.png and docs/screenshots/exhibit.png");
```

Run: `npm run build`, start `npm run preview` in the background, then `npm run readme-images`, then stop the preview (find its PID with `netstat -ano | grep ":4321 .*LISTENING"` and `taskkill //PID <pid> //F`).
Expected: the three PNGs exist. Open each and check: the banner is sharp and uncropped; the hall screenshot shows the placard and strip; the exhibit screenshot shows KolibriOS's desktop with the toolbar.

- [ ] **Step 2: Rewrite the README and the notices**

`README.md`:
~~~~markdown
<p align="center"><a href="https://hammadshakeelai.github.io/RetroMuseum/"><img src="docs/banner.png" alt="RetroMuseum: operating systems you can boot in your browser" width="100%"></a></p>

**Visit:** https://hammadshakeelai.github.io/RetroMuseum/

RetroMuseum is a museum of operating systems you can boot in your browser. Each exhibit is a real operating system running in the [v86](https://github.com/copy/v86) PC emulator, with its story, its facts, and things to try.

<p align="center"><img src="docs/screenshots/hall.png" alt="The RetroMuseum exhibit hall" width="100%"></p>
<p align="center"><img src="docs/screenshots/exhibit.png" alt="KolibriOS running on its exhibit page" width="100%"></p>

## Visiting

- **Exhibit hall:** one exhibit at a time, with **Previous** and **Next**, and every exhibit in a strip below, oldest first.
- **All exhibits:** every exhibit, filtered by family: DOS; Windows; Unix, BSD & Linux; Independent; Boot-sector.
- **An exhibit:** press **Boot it**. The system starts in the page and downloads its disk image as it reads it. The page says roughly how much that is.

Every exhibit booted to a working screen in RetroMuseum's screenshot check before it was added.

## Copyrighted exhibits

Some exhibits are copyrighted software, shown for their history. Their disk images load from copy.sh, the v86 project's server, and can't be downloaded from this site. If you hold rights to one and want it removed, [open a removal request](https://github.com/hammadshakeelai/RetroMuseum/issues/new?template=removal-request.yml).

## Development

Requires Node 22.12 or newer.

```bash
npm install
npm run dev            # http://localhost:4321/RetroMuseum/
npm test               # unit tests
npm run typecheck
npm run build && npm run test:e2e
```

### Adding an exhibit

1. Create `src/content/exhibits/<slug>.md`. Copy the exhibit's boot settings from its profile in v86's [`src/browser/main.js`](https://github.com/copy/v86/blob/master/src/browser/main.js): `state` becomes `initial_state`, `host` becomes `https://i.copy.sh/`, and sizes are written as numbers. See an existing exhibit for the other fields.
2. Write its story, facts, and things to try from the sources you list.
3. Run `npm run screenshots -- --only=<slug> --write`. It boots the exhibit, saves its screenshot, and records how much it downloads. Check the screenshot before committing.

A weekly workflow checks that every exhibit's disk images still load and opens an issue if one doesn't.

## License

MIT. See `THIRD_PARTY_NOTICES.md` for v86, SeaBIOS, and the operating systems shown.
~~~~

`THIRD_PARTY_NOTICES.md`:
~~~~markdown
# Third-Party Notices

RetroMuseum's own code is MIT-licensed (see `LICENSE`). It redistributes the following, each under its own license.

## v86

The emulator code bundled into the site and `v86.wasm`, both from the npm `v86` package, version 0.5.460.

- Project: https://github.com/copy/v86
- License: BSD-2-Clause (below). The v86 build also contains Berkeley SoftFloat, zstd decompression, and floppy code ported from QEMU, each under its own license; see the v86 repository.

```
Copyright (c) 2012, The v86 contributors
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## SeaBIOS and SeaVGABIOS

`public/bios/seabios.bin` and `public/bios/vgabios.bin`.

- Project: https://www.seabios.org/ (version `rel-1.16.2`)
- License: GNU Lesser General Public License v3
- Source: https://review.coreboot.org/seabios.git, tag `rel-1.16.2`

## Operating systems shown

No operating system image is stored in this repository or published on the site. When a visitor presses **Boot it**, the browser loads the disk image, and for some exhibits a saved machine snapshot, from `https://i.copy.sh/`, the v86 project's server. Each operating system remains under its own license. The Windows, MS-DOS, 86-DOS, and BeOS exhibits are copyrighted software, shown for their history.
~~~~

- [ ] **Step 3: Final local checks**

Run: `npm run lint; npm run typecheck; npm test; npm run build; npm run test:e2e`
Expected: all exit 0, 6 end-to-end tests passed.

- [ ] **Step 4: Commit, push, and open the pull request**

```bash
git add README.md THIRD_PARTY_NOTICES.md docs/banner.html docs/banner.png docs/screenshots/hall.png docs/screenshots/exhibit.png scripts/readme-images.ts
git commit -m "docs: RetroMuseum README, notices, banner and screenshots"
git push -u origin retromuseum
gh pr create -R hammadshakeelai/WebOS --base master --head retromuseum --title "RetroMuseum: replace WebOS with a museum of operating systems" --body-file <(cat <<'EOF'
Replaces the Browser Linux Lab with RetroMuseum (spec: `docs/superpowers/specs/2026-09-13-retromuseum-design.md`, plan: `docs/superpowers/plans/2026-09-13-retromuseum.md`).

- Astro static site: exhibit hall, All exhibits with family filters, one page per exhibit, About, 404.
- Exhibits boot in v86 on their page, with download progress, stall and error dialogs, fit-to-area scaling, and a machine toolbar.
- First exhibits (each passed the screenshot boot check): <list the included slugs>. Left out: <list with reasons, or "none">.
- Weekly exhibit health check and a removal-request template.
- Removes the old app, including the bundled Linux kernel image.

The site's base path comes from the repository name, so it deploys to /WebOS/ now and to /RetroMuseum/ after the rename. The rest of the collection follows in a second pull request.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
```

Replace the two `<…>` lists with the real results from Task 7 before running the command.

- [ ] **Step 5: Wait for CI, merge, and check the deploy**

```bash
gh pr checks -R hammadshakeelai/WebOS retromuseum --watch
gh api repos/hammadshakeelai/WebOS/environments/github-pages/deployment-branch-policies --jq '.branch_policies[].name'
```

Expected: "Lint, test, and build" passes; the environment policy lists `master`. If CI fails, read the log (`gh run view <id> -R hammadshakeelai/WebOS --log-failed`), fix the cause, commit, and push.

From outside the repo folder: `gh pr merge -R hammadshakeelai/WebOS retromuseum --squash`. Then find the Deploy run for the merge commit (`gh run list -R hammadshakeelai/WebOS --workflow deploy.yml --limit 1`) and wait for it to succeed.

Check the live site at `https://hammadshakeelai.github.io/WebOS/` in the Browser pane: the hall loads with the first exhibit; `exhibits/` filters; `exhibits/tetros/` boots TetrOS; `exhibits/windows1/` shows the copyright label; `about/` links to the removal request; `exhibits/nope/` shows File not found.

---

### Task 11: The rest of the collection

**Files:**
- Create: `src/content/exhibits/{86dos,msdos,windows2,windows31,windows95,windows98,windowsnt4,windows2000,unix-v7,minix,openbsd,netbsd,dsl,beos,haiku,serenity,redox,oberon,sortix,duskos}.md` and their screenshots

**Interfaces:**
- Consumes: the same authoring rules as Task 7, the collection schema, `npm run screenshots`.

- [ ] **Step 1: Branch from the merged master**

```bash
git switch master
git pull --ff-only
git switch -c exhibits-2
```

- [ ] **Step 2: Write the twenty files with these exact settings**

Follow Task 7's authoring rules for `maker`, `year`, `summary`, `facts`, `tryThis`, and the story. For snapshot exhibits (`initial_state`), the year and version come from the system shown after resuming.

`86dos.md`:
```yaml
title: 86-DOS
family: dos
license: proprietary
screenshotWaitSeconds: 30
homepage: https://www.os2museum.com/wp/pc-86-dos/
sources:
  - https://en.wikipedia.org/wiki/86-DOS
  - https://www.os2museum.com/wp/pc-86-dos/
v86:
  fda:
    url: https://i.copy.sh/pc86dos.img
    size: 163840
```

`msdos.md`:
```yaml
title: MS-DOS 6.22
family: dos
license: proprietary
screenshotWaitSeconds: 90
sources:
  - https://en.wikipedia.org/wiki/MS-DOS
v86:
  hda:
    url: https://i.copy.sh/msdos622/.img
    size: 67108864
    async: true
    fixed_chunk_size: 262144
    use_parts: true
```

`windows2.md`:
```yaml
title: Windows 2.03
family: windows
license: proprietary
screenshotWaitSeconds: 60
sources:
  - https://en.wikipedia.org/wiki/Windows_2.0
v86:
  hda:
    url: https://i.copy.sh/windows2.img
    size: 4177920
    async: false
```

`windows31.md`:
```yaml
title: Windows 3.1
family: windows
license: proprietary
screenshotWaitSeconds: 120
sources:
  - https://en.wikipedia.org/wiki/Windows_3.1
v86:
  memory_size: 67108864
  hda:
    url: https://i.copy.sh/win31.img
    size: 34463744
    async: false
```

`windows95.md`:
```yaml
title: Windows 95
family: windows
license: proprietary
screenshotWaitSeconds: 300
sources:
  - https://en.wikipedia.org/wiki/Windows_95
v86:
  memory_size: 67108864
  hda:
    url: https://i.copy.sh/windows95-v3/.img
    size: 471859200
    async: true
    fixed_chunk_size: 262144
    use_parts: true
```

`windows98.md`:
```yaml
title: Windows 98
family: windows
license: proprietary
screenshotWaitSeconds: 90
sources:
  - https://en.wikipedia.org/wiki/Windows_98
v86:
  memory_size: 134217728
  hda:
    url: https://i.copy.sh/windows98/.img
    size: 314572800
    async: true
    fixed_chunk_size: 262144
    use_parts: true
  initial_state:
    url: https://i.copy.sh/windows98_state-v2.bin.zst
```

`windowsnt4.md`:
```yaml
title: Windows NT 4.0
family: windows
license: proprietary
screenshotWaitSeconds: 300
sources:
  - https://en.wikipedia.org/wiki/Windows_NT_4.0
v86:
  memory_size: 536870912
  hda:
    url: https://i.copy.sh/winnt4_noacpi/.img
    size: 523837440
    async: true
    fixed_chunk_size: 262144
    use_parts: true
  cpuid_level: 2
```

`windows2000.md`:
```yaml
title: Windows 2000
family: windows
license: proprietary
screenshotWaitSeconds: 120
sources:
  - https://en.wikipedia.org/wiki/Windows_2000
v86:
  memory_size: 536870912
  hda:
    url: https://i.copy.sh/windows2k-v2/.img
    size: 2147483648
    async: true
    fixed_chunk_size: 262144
    use_parts: true
  initial_state:
    url: https://i.copy.sh/windows2k_state-v4.bin.zst
```

`unix-v7.md`:
```yaml
title: Unix V7
family: unix-bsd-linux
license: open-source
screenshotWaitSeconds: 120
sources:
  - https://en.wikipedia.org/wiki/Version_7_Unix
  - http://www.nordier.com/v7x86/
v86:
  hda:
    url: https://i.copy.sh/unix-v7x86-0.8a/.img
    size: 152764416
    async: true
    fixed_chunk_size: 262144
    use_parts: true
```

`minix.md`:
```yaml
title: Minix
family: unix-bsd-linux
license: open-source
screenshotWaitSeconds: 300
homepage: https://www.minix3.org/
sources:
  - https://en.wikipedia.org/wiki/Minix
  - https://www.minix3.org/
v86:
  memory_size: 268435456
  cdrom:
    url: https://i.copy.sh/minix-3.3.0/.iso
    size: 605581312
    async: true
    fixed_chunk_size: 1048576
    use_parts: true
```

`openbsd.md`:
```yaml
title: OpenBSD
family: unix-bsd-linux
license: open-source
screenshotWaitSeconds: 120
homepage: https://www.openbsd.org/
sources:
  - https://en.wikipedia.org/wiki/OpenBSD
  - https://www.openbsd.org/
v86:
  memory_size: 268435456
  hda:
    url: https://i.copy.sh/openbsd/.img
    size: 1073741824
    async: true
    fixed_chunk_size: 1048576
    use_parts: true
  initial_state:
    url: https://i.copy.sh/openbsd_state-v2.bin.zst
```

`netbsd.md`:
```yaml
title: NetBSD
family: unix-bsd-linux
license: open-source
screenshotWaitSeconds: 300
homepage: https://www.netbsd.org/
sources:
  - https://en.wikipedia.org/wiki/NetBSD
  - https://www.netbsd.org/
v86:
  memory_size: 268435456
  hda:
    url: https://i.copy.sh/netbsd/.img
    size: 511000064
    async: true
    fixed_chunk_size: 1048576
    use_parts: true
```

`dsl.md`:
```yaml
title: Damn Small Linux
family: unix-bsd-linux
license: open-source
screenshotWaitSeconds: 240
homepage: http://www.damnsmalllinux.org/
sources:
  - https://en.wikipedia.org/wiki/Damn_Small_Linux
  - http://www.damnsmalllinux.org/
v86:
  memory_size: 268435456
  cdrom:
    url: https://i.copy.sh/dsl-4.11.rc2.iso
    size: 52824064
    async: false
```

`beos.md`:
```yaml
title: BeOS 5
family: independent
license: proprietary
screenshotWaitSeconds: 300
sources:
  - https://en.wikipedia.org/wiki/BeOS
v86:
  memory_size: 536870912
  hda:
    url: https://i.copy.sh/beos5/.img
    size: 536870912
    async: true
    fixed_chunk_size: 1048576
    use_parts: true
```

`haiku.md`:
```yaml
title: Haiku
family: independent
license: open-source
screenshotWaitSeconds: 180
homepage: https://www.haiku-os.org/
sources:
  - https://en.wikipedia.org/wiki/Haiku_(operating_system)
  - https://www.haiku-os.org/
v86:
  memory_size: 536870912
  hda:
    url: https://i.copy.sh/haiku-v5/.img
    size: 1342177280
    async: true
    fixed_chunk_size: 1048576
    use_parts: true
  initial_state:
    url: https://i.copy.sh/haiku_state-v5.bin.zst
  acpi: true
```

`serenity.md`:
```yaml
title: SerenityOS
family: independent
license: open-source
screenshotWaitSeconds: 180
homepage: https://serenityos.org/
sources:
  - https://en.wikipedia.org/wiki/SerenityOS
  - https://serenityos.org/
v86:
  memory_size: 536870912
  hda:
    url: https://i.copy.sh/serenity-v3/.img.zst
    size: 734003200
    async: true
    fixed_chunk_size: 1048576
    use_parts: true
  initial_state:
    url: https://i.copy.sh/serenity_state-v4.bin.zst
```

`redox.md`:
```yaml
title: Redox
family: independent
license: open-source
screenshotWaitSeconds: 180
homepage: https://www.redox-os.org/
sources:
  - https://en.wikipedia.org/wiki/Redox_(operating_system)
  - https://www.redox-os.org/
v86:
  memory_size: 1073741824
  hda:
    url: https://i.copy.sh/redox_demo_i686_2024-09-07_1225_harddrive/.img
    size: 671088640
    async: true
    fixed_chunk_size: 1048576
    use_parts: true
  initial_state:
    url: https://i.copy.sh/redox_state-v2.bin.zst
  acpi: true
```

`oberon.md`:
```yaml
title: Oberon
family: independent
license: open-source
screenshotWaitSeconds: 60
sources:
  - https://en.wikipedia.org/wiki/Oberon_(operating_system)
v86:
  hda:
    url: https://i.copy.sh/oberon.img
    size: 25165824
    async: false
```

`sortix.md`:
```yaml
title: Sortix
family: independent
license: open-source
screenshotWaitSeconds: 180
homepage: https://sortix.org/
sources:
  - https://sortix.org/
v86:
  memory_size: 536870912
  cdrom:
    url: https://i.copy.sh/sortix-1.0-i686.iso
    size: 71075840
    async: false
```

`duskos.md`:
```yaml
title: Dusk OS
family: independent
license: open-source
screenshotWaitSeconds: 60
homepage: http://duskos.org/
sources:
  - http://duskos.org/
v86:
  hda:
    url: https://i.copy.sh/duskos.img
    size: 8388608
    async: false
```

- [ ] **Step 3: Take the screenshots in batches**

Run each batch in the background and wait for it to finish:
```bash
npm run screenshots -- --only=86dos,msdos,windows2,windows31,windows95,windows98,windowsnt4,windows2000 --write
npm run screenshots -- --only=unix-v7,minix,openbsd,netbsd,dsl --write
npm run screenshots -- --only=beos,haiku,serenity,redox,oberon,sortix,duskos --write
```

Expected: one line per exhibit and a count per batch. Review every PNG as in Task 7 Step 2, raise waits where the screen shows an earlier boot stage, and leave out exhibits that still fail. v86's own profile notes BeOS "segfaults if 256k bios is used": if BeOS fails, compare `public/bios/seabios.bin` with `https://github.com/copy/v86/raw/master/bios/seabios.bin` before leaving it out.

- [ ] **Step 4: Confirm the things to try, verify, and commit**

Boot each included exhibit in the preview and try every `tryThis` entry; fix any that don't work.

Run: `npm run lint; npm run typecheck; npm test; npm run build; npm run test:e2e; npm run health`
Expected: all exit 0.

```bash
git add src/content/exhibits
git commit -m "feat: add the rest of the collection"
git push -u origin exhibits-2
```

Open a pull request (`gh pr create -R hammadshakeelai/WebOS --base master --head exhibits-2 --title "Add the rest of the exhibits"`) whose body lists the included exhibits with their download sizes and any left out with reasons, ending with the Claude Code line. Wait for "Lint, test, and build", merge with `gh pr merge -R hammadshakeelai/WebOS exhibits-2 --squash` from outside the repo folder, wait for Deploy, and check three exhibits of different families on `https://hammadshakeelai.github.io/WebOS/`: a Windows snapshot exhibit (Windows 98 or 2000), a cold-boot exhibit (MS-DOS 6.22), and Haiku.

---

### Task 12: Rename the repo and check the site at /RetroMuseum/

**Files:** none (GitHub settings and local git config).

- [ ] **Step 1: Rename the repo and point the local clone at it**

```bash
cd /c/Users/HP
gh repo rename RetroMuseum -R hammadshakeelai/WebOS --yes
cd /c/Users/HP/Documents/GitHub/WebOS
git remote set-url origin https://github.com/hammadshakeelai/RetroMuseum.git
git fetch origin
git remote -v
```

Expected: `origin` shows `https://github.com/hammadshakeelai/RetroMuseum.git`; the fetch succeeds.

- [ ] **Step 2: Check the settings survived**

```bash
gh api repos/hammadshakeelai/RetroMuseum/branches/master/protection --jq '.required_status_checks.contexts'
gh api repos/hammadshakeelai/RetroMuseum/environments/github-pages/deployment-branch-policies --jq '.branch_policies[].name'
gh api repos/hammadshakeelai/RetroMuseum --jq '.default_branch'
```

Expected: `["Lint, test, and build"]`, `master`, `master`.

- [ ] **Step 3: Deploy again under the new name**

```bash
gh workflow run deploy.yml -R hammadshakeelai/RetroMuseum --ref master
gh run list -R hammadshakeelai/RetroMuseum --workflow deploy.yml --limit 1
```

Wait for the run to succeed (`gh run watch <id> -R hammadshakeelai/RetroMuseum`).

- [ ] **Step 4: Check the live site**

```bash
for path in "" exhibits/ exhibits/tetros/ about/; do curl -s -o /dev/null -w "%{http_code} /RetroMuseum/$path\n" "https://hammadshakeelai.github.io/RetroMuseum/$path"; done
curl -s "https://hammadshakeelai.github.io/RetroMuseum/exhibits/nope/" | grep -c "The page you asked for isn't in the collection."
```

Expected: `200` for all four; `1` for the not-found text.

In the Browser pane, open `https://hammadshakeelai.github.io/RetroMuseum/`: step through the hall, filter by Windows, boot TetrOS and one large exhibit, and confirm the About page's removal link opens the removal-request form on `hammadshakeelai/RetroMuseum`.

- [ ] **Step 5: Run the health check once**

```bash
gh workflow run exhibit-health.yml -R hammadshakeelai/RetroMuseum --ref master
```

Wait for it; expected: success, and no `exhibit-health` issue opened.

- [ ] **Step 6: Check "Done means" (spec section 11)**

- Every shipped exhibit passed the screenshot script's boot check (Tasks 7 and 11).
- The hall, All exhibits, and exhibit pages work at desktop and phone widths (check `mobile` in the Browser pane).
- Every proprietary exhibit shows the copyright label; the removal-request template exists.
- The About page credits v86 and copy.sh.
- CI, Deploy, and Exhibit health are green.
- The README has a banner and screenshots.

Report anything that isn't true, with what's left to do.
