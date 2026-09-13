# RetroMuseum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Revised 2026-09-13, during Task 4 (spec section 12).** `i.copy.sh` refuses disk-image requests that come from other sites, so small open-source exhibits are now hosted on RetroMuseum's site and the rest open on copy.sh. Tasks 1 to 3 were finished before the revision and are kept as written; Task 4 amends their v86 block schema and `Machine`, and removes `src/lib/parts.ts`. Tasks 4 to 12 are the revised tasks. They give exact interfaces, behaviour, tests, settings, and commands; the code for each is in that task's commit.

**Goal:** Replace the WebOS app with RetroMuseum: an Astro static site of operating-system exhibits, where small open-source systems boot in v86 on their own page from disk images the site hosts and the others open on copy.sh, with an exhibit hall, an All exhibits grid, sourced history, a weekly health check, and the repo renamed at the end.

**Architecture:** Astro 7 builds a static site from one Markdown file per exhibit, validated by a content collection schema. A hosted exhibit carries its v86 boot settings and its disk image's origin, SHA-256, license, and source; `npm run images` downloads those images into `public/images/` before each build. A copy.sh exhibit carries a v86 profile id instead. Hosted exhibit pages import v86 only when **Boot it** is pressed; a small `Machine` class (unit-tested against a fake emulator) owns booting, download progress, stall detection, errors, and screen fitting. A local Playwright script photographs every exhibit, hosted ones in a Vite-served harness page and the others on copy.sh's own page, and a weekly workflow checks image origins, the live site, and v86's profile list.

**Tech Stack:** Astro 7.3.2, TypeScript 6.0.3 with `@astrojs/check` 0.9.10, v86 0.5.460 (npm), Vitest 5.0.0, happy-dom 20.14.5, Playwright 1.63.0, oxlint 1.82.0, yaml 2.9.1, Vite 8.3.0 (screenshot harness only), Node 24, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-13-retromuseum-design.md`

## Global Constraints

- Repo `hammadshakeelai/WebOS` until Task 12 renames it `hammadshakeelai/RetroMuseum`. Protected default branch `master`. Local path `C:\Users\HP\Documents\GitHub\WebOS` (the folder keeps its name).
- Work branch `retromuseum`, created from `design-specs` (which carries the specs and this plan). The second batch of exhibits goes on `exhibits-2`, created from `master` after the first merge.
- Base path comes from the `BASE_PATH` environment variable (`/WebOS/` or `/RetroMuseum/`, with both slashes), which workflows set to `/${{ github.event.repository.name }}/`. It defaults to `/RetroMuseum/` locally. `site` is `https://hammadshakeelai.github.io`; `trailingSlash` is `"always"`.
- Exact versions: `astro@7.3.2`, `v86@0.5.460`, `@astrojs/check@0.9.10`, `typescript@6.0.3`, `vitest@5.0.0`, `happy-dom@20.14.5`, `@playwright/test@1.63.0`, `oxlint@1.82.0`, `yaml@2.9.1`, `vite@8.3.0`, `@types/node@26.5.1`. TypeScript stays on 6.x: `@astrojs/check` 0.9.10 peers `typescript@^5 || ^6`.
- No UI framework. Client scripts are plain TypeScript bundled by Astro. `v86` is imported with a dynamic `import("v86")` when **Boot it** is pressed.
- Every `.ts` file uses explicit `.ts` import extensions and only erasable TypeScript syntax (no enums, no parameter properties, no namespaces), so Node 24 runs `scripts/*.ts` directly.
- An exhibit is **hosted** (`diskImage` and `v86`) or a **copy.sh exhibit** (`copyShProfile`), never both and never neither.
  - `v86` allows only `memory_size`, `vga_memory_size`, `fda`, `hda`, `cdrom` (each with `url`, a file name matching `^[A-Za-z0-9][A-Za-z0-9._-]*$`, `size` in bytes, and optional `async`), `acpi`, `boot_order`, `cpuid_level`, and has exactly one disk.
  - `diskImage` has `from` (URL), `sha256` (64 lowercase hex characters), `license` (text), and optional `source` (URL).
  - `copyShProfile` matches `^[a-z0-9-]+$`; the page links to `https://copy.sh/v86/?profile=<id>`.
  - Converting from v86's `src/browser/main.js`: arithmetic becomes a number, `host + "name"` becomes the file name, `mac_address_translation` is dropped, and a copy.sh exhibit takes the profile's `id`.
- The page passes the block to v86 with the disk's `url` prefixed by `<base>images/`, adding only `wasm_path`, `bios`, `vga_bios`, `screen: { container, use_graphical_text: true }`, and `autostart: true`.
- The screen container has exactly the structure from v86's `examples/basic.html`: a `<div style="white-space: pre; font: 14px monospace; line-height: 14px">` followed by a `<canvas style="display: none">`.
- Stall rule: a download with a known length that started but got no new bytes for 60 seconds. Checked every 5 seconds. Downloads with unknown length, finished downloads, and time with no download never count.
- Ctrl+Alt+Del scancodes (v86 `src/browser/main.js`): `[0x1d, 0x38, 0x53, 0x9d, 0xb8, 0xd3]`.
- v86's ScreenAdapter divides the scale passed to `screen_set_scale` by `devicePixelRatio` when that ratio has a fractional part, and leaves the canvas size alone when the result is exactly 1. `Machine.fit` multiplies by the ratio under the same rule and never leaves v86 with exactly 1; the page and the harness give the machine `devicePixelRatio: () => window.devicePixelRatio || 1` (found in Task 6, where a 1.25 ratio showed the screen at 80% of its area).
- Hosted exhibits: `tetros`, `sectorlisp`, `floppybird`, `bootchess`, `freedos`, `kolibrios`, `duskos`, `oberon`, `helenos`, `elks`, `sortix`. copy.sh exhibits: `86dos`, `msdos`, `windows1`, `windows2`, `windows31`, `windows95`, `windows98`, `windowsnt4`, `windows2000`, `unix-v7`, `minix`, `openbsd`, `netbsd`, `dsl`, `beos`, `haiku`, `serenity`, `redox`.
- Proprietary exhibits: `86dos`, `msdos`, `windows1`, `windows2`, `windows31`, `windows95`, `windows98`, `windowsnt4`, `windows2000`, `beos`. All others are `open-source`.
- Disk images are never committed. `public/images/` is ignored by git and filled by `npm run images`, which runs before every build that is served or tested (CI, deploy, local end-to-end tests, screenshots). Hosted images total at most 500 MB, and none is over 100 MB.
- A visitor's browser never requests `i.copy.sh` from RetroMuseum, and the site never sets a `no-referrer` policy to get around its rule.
- User-facing text, exactly:
  - Copyright label: "Copyrighted software, shown for its history. It runs on copy.sh, the v86 project's site; RetroMuseum doesn't host it."
  - Download line (hosted): "Downloads as it runs, about N MB to reach the desktop."
  - copy.sh button: "Run it on copy.sh". copy.sh line: "Opens on copy.sh, the v86 project's site, and downloads about N MB as it runs."
  - Card lines: "Boots on this page", "Runs on copy.sh".
  - Disk image line (hosted, under the facts): "Disk image: <license>." followed, when `source` is set, by a link "Source code".
  - Touch note: "Best with a keyboard and mouse"
  - Download and stall dialog: title "Disk image", text "Couldn't load the disk image. Check your connection and try again."
  - No WebAssembly: "This exhibit can't run in this browser: it needs WebAssembly, which this browser doesn't support."
  - Mouse hint: "Press Esc to release the mouse."
  - Toolbar buttons: "Full screen", "Capture mouse", "Ctrl+Alt+Del", "Restart", "Stop". Screen button: "Boot it". Hall: "Visit exhibit", "Previous", "Next".
  - Window titles: "RetroMuseum: <page title>". 404: "File not found", "The page you asked for isn't in the collection.", link "Back to the exhibit hall".
- Families, in display order: `dos` "DOS", `windows` "Windows", `unix-bsd-linux` "Unix, BSD & Linux", `independent` "Independent", `boot-sector` "Boot-sector".
- Required CI check name: `Lint, test, and build`. Keep branch protection, the `github-pages` environment, and Dependabot.
- GitHub Actions versions: `actions/checkout@v7`, `actions/setup-node@v7`, `actions/cache@v6`, `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`.
- Screenshots are taken locally only, never in CI.
- Rename the repo only after the new site is live at `/WebOS/` (Task 12).
- Never `git add .` or `git add -A`: the repo root holds untracked personal files (a screen recording, screenshots, `.claude/`, `.impeccable/`, `.remember/`). Stage exact paths.

## File Structure

```
WebOS/ (renamed RetroMuseum in Task 12)
├── .github/
│   ├── dependabot.yml                   # kept; TypeScript majors ignored
│   ├── ISSUE_TEMPLATE/removal-request.yml
│   └── workflows/
│       ├── ci.yml                       # PRs: "Lint, test, and build" (fetches images, cached)
│       ├── deploy.yml                   # master: fetch images, build, publish to Pages
│       └── exhibit-health.yml           # weekly + on demand: origins, live site, v86 profiles
├── astro.config.mjs
├── package.json, package-lock.json, tsconfig.json, vitest.config.ts, playwright.config.ts
├── .oxlintrc.json, .gitignore
├── public/
│   ├── bios/seabios.bin, bios/vgabios.bin   # kept from WebOS
│   ├── images/                          # hosted disk images; ignored by git, filled by npm run images
│   └── favicon.svg
├── src/
│   ├── content.config.ts                # exhibits collection schema
│   ├── content/exhibits/<slug>.md       # one file per exhibit
│   ├── content/exhibits/screenshots/<slug>.png
│   ├── lib/
│   │   ├── families.ts                  # family ids, labels, order
│   │   ├── exhibits.ts                  # page text, copy.sh link, exhibit kind rule, year sort
│   │   ├── filter.ts                    # family filter rule
│   │   ├── hall.ts                      # Previous/Next index stepping
│   │   └── v86-block.ts                 # Zod schemas for the v86 block and the disk image
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
│   │   ├── exhibits/[slug].astro        # Exhibit page (hosted or copy.sh)
│   │   ├── about.astro
│   │   └── 404.astro
│   └── **/*.test.ts                     # unit tests next to the code
├── scripts/
│   ├── exhibits.ts (+ .test.ts)         # read and edit exhibit frontmatter
│   ├── images.ts (+ .test.ts)           # download and verify hosted disk images
│   ├── screenshots.ts                   # photograph each exhibit, measure its download
│   ├── screenshots/index.html, harness.ts
│   ├── exhibit-health.ts (+ .test.ts)   # weekly check
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
/**
 * True when fewer than `minFraction` of the RGBA pixels differ from the screen's most common
 * colour. Measuring against the most common colour (not the first pixel) keeps a cursor or a
 * character in the top-left corner from making an empty screen look busy.
 */
export function isBlank(pixels: Uint8ClampedArray, minFraction = 0.0005): boolean {
  const count = Math.floor(pixels.length / 4);
  if (count === 0) return true;
  const colors = new Map<number, number>();
  let mostCommon = 0;
  for (let i = 0; i < count * 4; i += 4) {
    const color = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
    const seen = (colors.get(color) ?? 0) + 1;
    colors.set(color, seen);
    if (seen > mostCommon) mostCommon = seen;
  }
  return (count - mostCommon) / count < minFraction;
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

### Task 4: Hosted disk images, the collection schema, the screenshot script, and TetrOS

**Files:**
- Modify: `src/lib/v86-block.ts`, `src/lib/v86-block.test.ts`, `src/lib/exhibits.ts`, `src/lib/exhibits.test.ts`, `src/emulator/machine.ts`, `src/emulator/machine.test.ts`, `package.json`, `.gitignore`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- Delete: `src/lib/parts.ts`, `src/lib/parts.test.ts`
- Create: `src/content.config.ts`, `scripts/exhibits.ts`, `scripts/exhibits.test.ts`, `scripts/images.ts`, `scripts/images.test.ts`, `scripts/screenshots.ts`, `scripts/screenshots/index.html`, `scripts/screenshots/harness.ts`, `src/content/exhibits/tetros.md`, `src/content/exhibits/screenshots/tetros.png` (generated)

**Interfaces:**
- Consumes: `FAMILY_IDS` (`src/lib/families.ts`), `Machine`, `type Emulator`, `type MachineState` (`src/emulator/machine.ts`), `createScreen` (`src/emulator/screen.ts`), `isBlank` (`src/emulator/blank.ts`).
- Produces:
  - `src/lib/v86-block.ts`: `FILE_NAME: RegExp`, `v86BlockSchema`, `type V86Block`, `interface Disk { url: string; size: number; async?: boolean }`, `diskOf(block: V86Block): Disk`, `diskImageSchema`, `type DiskImage`.
  - `src/lib/exhibits.ts`: `COPYRIGHT_LABEL`, `downloadLine(megabytes: number): string`, `copyShLine(megabytes: number): string`, `copyShUrl(profile: string): string`, `exhibitKindIssue(data: { v86?: unknown; diskImage?: unknown; copyShProfile?: unknown }): string | null`, `byYear`.
  - `src/emulator/machine.ts`: `Runtime` gains `imageBase: string`; `v86Options` sets the disk's `url` to `imageBase + url`.
  - Collection `exhibits`; `CollectionEntry<"exhibits">` `data`: `title`, `maker`, `year`, `family`, `license`, `summary`, `downloadEstimateMB`, `screenshotWaitSeconds`, `facts: Record<string, string>`, `tryThis: string[]`, `homepage?`, `screenshot` (image metadata), `sources: string[]`, `diskImage?: DiskImage`, `v86?: V86Block`, `copyShProfile?: string`.
  - `scripts/exhibits.ts`: `interface ExhibitFile { slug; path; data: Record<string, unknown> }`, `readFrontmatter(text)`, `setFrontmatterValue(text, key, value)`, `readExhibits(dir)`, `updateExhibitFile(path, values)`.
  - `scripts/images.ts`: `interface HostedImage { slug: string; file: string; size: number; from: string; sha256: string }`, `type Fetcher = (url: string) => Promise<Response>`, `MAX_TOTAL_BYTES` (500 MB), `hostedImages(exhibits: ExhibitFile[]): HostedImage[]`, `syncImages(images: HostedImage[], dir: string, options?: { fetcher?: Fetcher; maxTotalBytes?: number; log?: (line: string) => void }): Promise<void>`; `npm run images`.
  - `scripts/screenshots/harness.ts`: `window.harness.boot(block: V86Block): Promise<void>`, `window.harness.error(): string | null`, `window.harness.isBlankPng(base64: string): Promise<boolean>`.
  - `npm run screenshots -- [--only=a,b] [--write]`.

- [ ] **Step 1: Test the new v86 block and exhibit rules, and see them fail**

`src/lib/v86-block.test.ts` covers, each as its own test:
- a hosted profile passes: `memory_size: 268435456`, `cdrom: { url: "HelenOS-0.14.1-ia32.iso", size: 25792512, async: false }`, plus `acpi`, `boot_order`, `cpuid_level`;
- snapshots, split images, and keys only v86's site uses fail: `initial_state`, `state`, `mac_address_translation`, a disk with `use_parts` or `fixed_chunk_size`;
- exactly one disk: none fails, `fda` plus `hda` fails;
- the disk needs `size`;
- `url` is a file name: `https://i.copy.sh/tetros.img`, `../tetros.img`, and `images/tetros.img` fail;
- `diskOf` returns the one disk;
- `diskImageSchema` accepts `{ from, sha256, license }` with and without `source`, and rejects an uppercase or 63-character `sha256`, a missing `license`, and a `from` that isn't a URL.

`src/lib/exhibits.test.ts` covers:
- `COPYRIGHT_LABEL` is "Copyrighted software, shown for its history. It runs on copy.sh, the v86 project's site; RetroMuseum doesn't host it.";
- `downloadLine(40)` is "Downloads as it runs, about 40 MB to reach the desktop.";
- `copyShLine(40)` is "Opens on copy.sh, the v86 project's site, and downloads about 40 MB as it runs.";
- `copyShUrl("windows95")` is `https://copy.sh/v86/?profile=windows95`;
- `exhibitKindIssue` returns `null` for `{ v86, diskImage }` and for `{ copyShProfile }`, and a message for both kinds at once, for neither, for `v86` without `diskImage`, and for `diskImage` without `v86`;
- `byYear` sorts by year, then title.

Run: `npx vitest run src/lib`
Expected: FAIL (the new names aren't exported yet).

- [ ] **Step 2: Write them, point the machine at the site's images, and remove the part-name helper**

Write `src/lib/v86-block.ts` and `src/lib/exhibits.ts` to pass Step 1. In `src/emulator/machine.test.ts`, the first test becomes "passes the block to v86 with its disk in the site's images folder, adding only the runtime, screen and autostart": block `{ fda: { url: "tetros.img", size: 512 } }`, runtime with `imageBase: "/RetroMuseum/images/"`, expected options `{ fda: { url: "/RetroMuseum/images/tetros.img", size: 512 }, wasm_path, bios, vga_bios, screen: { container, use_graphical_text: true }, autostart: true }`. Change `v86Options` to match. Delete `src/lib/parts.ts` and `src/lib/parts.test.ts` (nothing loads split images now).

Run: `npx vitest run src`
Expected: PASS.

- [ ] **Step 3: Test and write the exhibit file tools**

`scripts/exhibits.test.ts` (6 tests) and `scripts/exhibits.ts`: `readFrontmatter` parses nested YAML and fails with "Missing frontmatter" or "Frontmatter isn't a mapping"; `setFrontmatterValue` adds a missing top-level key before the closing `---`, replaces an existing top-level key without touching one that only shares its prefix or a nested key of the same name, and keeps Windows line endings. In `package.json`, `lint` becomes `oxlint --deny-warnings src scripts`.

Run: `npx vitest run scripts/exhibits.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 4: Test the image downloader and see it fail**

`scripts/images.test.ts`, using a temporary directory and a fake fetcher that serves byte arrays by URL:
- `hostedImages` lists each hosted exhibit's disk file, size, origin, and hash, and skips copy.sh exhibits;
- `hostedImages` throws a message naming the exhibit when a hosted exhibit has no disk `size`;
- `syncImages` downloads a missing image;
- keeps a file whose hash already matches, without requesting it;
- replaces a file whose hash doesn't match;
- rejects a download with the wrong hash, with a message naming both hashes, and leaves no file behind;
- rejects a download of the wrong size;
- rejects an HTTP error, naming the status;
- deletes files in the directory that no exhibit lists;
- refuses, before downloading, when the images total more than `maxTotalBytes`.

Run: `npx vitest run scripts/images.test.ts`
Expected: FAIL, "Failed to load url ./images.ts".

- [ ] **Step 5: Write the downloader, the collection schema, and the workflow steps**

`scripts/images.ts` passes Step 4. Downloads go to `<file>.part` and are renamed only after the size and SHA-256 match. Run directly, it syncs `src/content/exhibits` into `public/images/` and prints `<n> images, <MB> MB in public/images/`.

`package.json` gains `"images": "node scripts/images.ts"`. `.gitignore` gains `public/images/`.

`src/content.config.ts`: the collection from Interfaces, a `z.strictObject` with `diskImage: diskImageSchema.optional()`, `v86: v86BlockSchema.optional()`, `copyShProfile: z.string().regex(/^[a-z0-9-]+$/).optional()`, and a `superRefine` that adds `exhibitKindIssue`'s message as an issue.

In both `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`, before `- run: npm run build`:
```yaml
      - uses: actions/cache@v6
        with:
          path: public/images
          key: exhibit-images-${{ hashFiles('src/content/exhibits/*.md') }}
          restore-keys: exhibit-images-

      - run: npm run images
```

Run: `npx vitest run scripts`
Expected: PASS.

- [ ] **Step 6: Write the screenshot harness and script**

`scripts/screenshots/index.html` loads `harness.ts` into a black page with `<div id="screen">`. `harness.ts` creates the screen with `createScreen`, a `Machine` with the real v86, and exposes:
- `boot(block)`: boots with `wasmUrl` from `v86/build/v86.wasm?url`, `biosUrl: "/bios/seabios.bin"`, `vgaBiosUrl: "/bios/vgabios.bin"`, `imageBase: "/images/"`;
- `error()`: the machine's error kind, or `null`;
- `isBlankPng(base64)`: decodes the PNG with `createImageBitmap`, draws it on an `OffscreenCanvas`, and returns `isBlank` of its pixels.

`scripts/screenshots.ts` starts Vite (`configFile: false`, root `scripts/screenshots`, `publicDir` `public`, port 5199) and Chromium, opens one harness page for blank checks, then for each selected exhibit opens a 1280×1024 page and:
- counts megabytes from `requestfinished` events (`request.sizes()`'s `responseBodySize`) for disk-image requests: paths under `/images/` for hosted exhibits, host `i.copy.sh` for copy.sh exhibits;
- a hosted exhibit: opens the harness and calls `boot` with its `v86` block (the screen is `#screen .v86-screen`);
- a copy.sh exhibit: opens `copyShUrl(profile)` (the screen is `#screen_container`);
- waits `screenshotWaitSeconds` (default 120);
- photographs the screen's `canvas` if it is visible, otherwise its text `div`;
- passes when the photo isn't blank and, for a hosted exhibit, `error()` is `null`;
- with `--write`, saves the PNG to `src/content/exhibits/screenshots/<slug>.png` and sets `downloadEstimateMB` (at least 1, rounded up) and `screenshot` in the file;
- prints `PASS|FAIL  <slug> <MB> MB  <reason>`, then `<n> of <m> exhibits passed.`, and exits 1 if any failed.

- [ ] **Step 7: Write the TetrOS exhibit from its sources**

Fetch https://github.com/daniel-e/tetros and its README; take the maker, year, facts, and story from them only. Create `src/content/exhibits/tetros.md` without `downloadEstimateMB` and `screenshot`, with these settings:
```yaml
title: TetrOS
family: boot-sector
license: open-source
screenshotWaitSeconds: 30
homepage: https://github.com/daniel-e/tetros
sources:
  - https://github.com/daniel-e/tetros
diskImage:
  from: https://raw.githubusercontent.com/daniel-e/tetros/f0ebf20cd7bf81c8f7bbd3500892257057b0cee4/tetros.img
  sha256: fb9c23e1ffbe25ee35e2dd5a4f60c7e79710d0319ffa83da89fe0dd8a79f293c
  license: MIT
  source: https://github.com/daniel-e/tetros
v86:
  fda:
    url: tetros.img
    size: 512
```

- [ ] **Step 8: Fetch the image and take the screenshot**

```bash
npm run images
npx playwright install chromium
npm run screenshots -- --only=tetros --write
```

Expected: `1 images, 0 MB in public/images/`; `PASS  tetros  1 MB`; `1 of 1 exhibits passed.`; `tetros.md` gains `downloadEstimateMB: 1` and `screenshot: ./screenshots/tetros.png`. Open the PNG: it shows the TetrOS playfield, not a BIOS message.

- [ ] **Step 9: Verify the build validates exhibits**

Run: `npm run lint; npm run typecheck; npm test; npm run build`
Expected: all exit 0, and `dist/images/tetros.img` exists. Then add `copyShProfile: tetros` to `tetros.md`, run `npm run build`, and confirm it fails with the kind rule's message; remove the line.

- [ ] **Step 10: Commit**

Stage the files listed above by exact path, including the deletions and the docs revision (`docs/superpowers/specs/2026-09-13-retromuseum-design.md`, `docs/superpowers/plans/2026-09-13-retromuseum.md`), and commit: `feat: host small open-source disk images, add the exhibits collection, screenshot script and TetrOS`.

---

### Task 5: The pages: hall, All exhibits, exhibit page, About

**Files:**
- Create: `src/pages/index.astro`, `src/pages/exhibits/index.astro`, `src/pages/exhibits/[slug].astro`, `src/pages/about.astro`, `src/scripts/hall.ts`, `src/scripts/filter.ts`

**Interfaces:**
- Consumes: `Window.astro`; `byYear`, `COPYRIGHT_LABEL`, `downloadLine`, `copyShLine`, `copyShUrl` (`src/lib/exhibits.ts`); `familiesPresent`, `familyLabel`; `matchesFilter`; `stepIndex`; collection `exhibits`.
- Produces (used by Tasks 6 and 8):
  - Hall ids: `featured-image`, `featured-title`, `featured-maker-year`, `featured-summary`, `visit`, `previous`, `next`, `hall-data` (JSON), strip buttons with `data-hall-index` and `aria-current`.
  - All exhibits: buttons with `data-filter` (`all` or a family id) and `aria-pressed`; cards `li.card[data-family]`, each with "Boots on this page" or "Runs on copy.sh".
  - Hosted exhibit page: `section.exhibit-screen[data-estimate-mb][data-base]`, ids `screen-area`, `poster`, `boot`, `no-wasm`, `live`, `machine-toolbar`, `fullscreen`, `capture`, `ctrl-alt-del`, `restart`, `stop`, `progress-bar`, `downloaded`, `error-dialog`, `error-message`, `retry`, `error-stop`, `exhibit-v86` (JSON), and `p.disk-image`.
  - copy.sh exhibit page: `section.exhibit-screen.copy-sh` with the poster and `a#run-on-copy-sh`; no emulator ids and no `exhibit-v86`.

- [ ] **Step 1: Write the hall page and its script**

`index.astro` sorts exhibits with `byYear`, builds the hall items (title, "maker, year", summary, page link, 960-pixel screenshot from `getImage`, alt text) into `#hall-data`, shows the first item in the featured frame and placard with **Visit exhibit**, **Previous**, **Next**, and a strip of 240-pixel thumbnails. `src/scripts/hall.ts` steps with `stepIndex`, updates the frame, placard, link, and `aria-current`, and scrolls the current thumbnail into view.

- [ ] **Step 2: Write the All exhibits page and its script**

`exhibits/index.astro` shows **All** and one button per family present (`familiesPresent`), and a grid of cards (480-pixel screenshot, title, "maker, year", family label, and "Boots on this page" when `v86` is set, otherwise "Runs on copy.sh"). `src/scripts/filter.ts` sets `aria-pressed` and hides cards with `matchesFilter`.

- [ ] **Step 3: Write the exhibit page**

`exhibits/[slug].astro` renders one page per exhibit, with the window title, the summary as description, and a 1200-pixel PNG preview (`getImage`) as `og:image`. Then:
- **Hosted** (`data.v86`): the screen section from Interfaces, with the poster (1024-pixel screenshot, **Boot it**, `downloadLine`, touch note, hidden no-WebAssembly message), the hidden live area and toolbar (**Full screen**, **Capture mouse**, **Ctrl+Alt+Del**, **Restart**, **Stop**, progress bar, downloaded count, mouse hint), the error dialog titled "Disk image" with "Couldn't load the disk image. Check your connection and try again.", **Retry** and **Stop**, and `data.v86` as JSON.
- **copy.sh** (`data.copyShProfile`): the poster with a bevelled link **Run it on copy.sh** to `copyShUrl(profile)`, `copyShLine`, and the touch note.
- Below: `COPYRIGHT_LABEL` for proprietary exhibits; the story with "maker, year. family."; facts; things to try; sources (hostnames linked); the homepage link; and, for hosted exhibits, `<p class="disk-image">Disk image: <license>. <a>Source code</a></p>` (the link only when `source` is set).

- [ ] **Step 4: Write the About page**

Sections, in the site's voice:
- **What this is.** RetroMuseum is a museum of operating systems you can boot in your browser, with each system's story, facts, and things to try. Nothing is installed on your computer.
- **Credits.** Every exhibit runs in v86 (linked), an x86 PC emulator by the v86 contributors. Small open-source exhibits boot on this site from disk images it hosts; their pages name each image's license and link to its source code, and `THIRD_PARTY_NOTICES.md` lists where each image came from. The other exhibits open on copy.sh (linked), the v86 project's own site, which hosts their disk images.
- **Licenses.** RetroMuseum's own code: MIT. v86: BSD-2-Clause. SeaBIOS and SeaVGABIOS: GNU LGPL v3. Each operating system keeps its own license. Copyrighted exhibits are shown for their history; they run on copy.sh, and RetroMuseum doesn't host or offer their disk images.
- **Asking for an exhibit to be removed.** The removal-request link (`<repo>/issues/new?template=removal-request.yml`), "A valid request is handled by deleting that exhibit.", and the GitHub link.

- [ ] **Step 5: Build and look at every page**

Run: `npm run lint; npm run typecheck; npm test; npm run images; npm run build`
Expected: all exit 0; `dist/index.html`, `dist/exhibits/index.html`, `dist/exhibits/tetros/index.html`, `dist/about/index.html`, `dist/404.html` exist.

Preview (`retromuseum-preview` in `.claude/launch.json`: `npm run preview`, port 4321) at `http://localhost:4321/RetroMuseum/`, at 1280 px and the `mobile` preset: the hall shows TetrOS and **Next**/**Previous** work with one exhibit; `exhibits/` shows the TetrOS card with "Boots on this page"; `exhibits/tetros/` shows the poster, **Boot it**, the download line, facts, things to try, sources, "Disk image: MIT. Source code", and no copyright label; `about/` and `exhibits/nope/` render. Stop the preview.

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
- Consumes: `Machine`, `type Emulator`, `type MachineState`; `createScreen`, `naturalSize`, `type ScreenElements`; `type V86Block`; the hosted exhibit page ids from Task 5.

- [ ] **Step 1: Write the page script**

`src/scripts/exhibit-page.ts` does nothing unless `#exhibit-v86` exists. It reads the block, `data-estimate-mb`, and `data-base`, and creates a `Machine` whose `create` imports `v86` dynamically. `render(state)`:
- no WebAssembly: hides **Boot it** and shows the message;
- idle: shows the poster, removes the screen, closes the dialog;
- running: shows the live screen and toolbar, "<n> MB downloaded", and the progress bar against the estimate;
- error: also opens the dialog, with its **Stop** only for stalls.

**Boot it**, **Retry**, and **Restart** replace the screen container and boot with `wasmUrl`, `biosUrl: <base>bios/seabios.bin`, `vgaBiosUrl: <base>bios/vgabios.bin`, `imageBase: <base>images/`. **Stop** (both) stops. The toolbar buttons call `fullscreen`, `captureMouse`, `ctrlAltDel`; clicking the live screen captures the mouse. A `ResizeObserver` on the screen area, `fullscreenchange`, and `screen-set-size` refit (fullscreen fits the window); `pagehide` stops.

- [ ] **Step 2: Load it on the exhibit page**

After `</Window>` in `[slug].astro`: `<script>import "../../scripts/exhibit-page.ts";</script>`.

- [ ] **Step 3: Verify in the browser**

Run: `npm run lint; npm run typecheck; npm test; npm run build`
Expected: all exit 0; `dist/_astro` has a separate v86 chunk and a `v86.*.wasm`.

In the preview at `exhibits/tetros/`:
1. No v86 chunk or `.wasm` request before pressing anything.
2. **Boot it**: the live screen fills the area without cropping, the toolbar appears, and the network shows `/RetroMuseum/images/tetros.img` and no request to `i.copy.sh`.
3. At the `mobile` preset the screen shrinks and stays whole.
4. **Ctrl+Alt+Del** restarts TetrOS; **Restart** boots again; **Stop** brings back the poster.
5. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/exhibit-page.ts "src/pages/exhibits/[slug].astro"
git commit -m "feat: boot hosted exhibits on their page with progress, errors and the machine toolbar"
```

---

### Task 7: The first exhibits

**Files:**
- Create: `src/content/exhibits/{sectorlisp,floppybird,bootchess,freedos,kolibrios,helenos,elks,windows1}.md` and their screenshots

**Interfaces:**
- Consumes: the collection schema, `npm run images`, `npm run screenshots` (Task 4).

Every exhibit follows TetrOS. For each:
1. Fetch its sources (below, and any page they cite for a fact you use).
2. Write `maker`, `year` (the release year of the version shown), `summary` (one sentence, at most 140 characters), `facts` (two to four display-style labels; quote values that look like numbers), `tryThis` (two to four things confirmed on the running exhibit), and a story of two to four short paragraphs. Every claim comes from a listed source. No marketing language.
3. Copy the settings below exactly.
4. Leave out `downloadEstimateMB` and `screenshot`.

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
diskImage:
  from: https://i.copy.sh/sectorlisp-friendly.bin
  sha256: 2b71dffae9900f3aa280ad6eb3bb2752dffb589a8d9a5463515683d03e7021d8
  license: ISC
  source: https://github.com/jart/sectorlisp/tree/friendly
v86:
  fda:
    url: sectorlisp-friendly.bin
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
diskImage:
  from: https://raw.githubusercontent.com/icebreaker/floppybird/5c8f3d1fd6e5d8243240d49428bfad36ba95b909/build/iso/floppybird.img
  sha256: 5db1b469e25e9eda7b8c0f666d6b655bab083c85618a9453ee72f1201cca840f
  license: MIT
  source: https://github.com/icebreaker/floppybird
v86:
  fda:
    url: floppybird.img
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
diskImage:
  from: https://i.copy.sh/bootchess.img
  sha256: 04cd453801433b51e8684814977b30dfc0367315706ce792438601eaf1da88a1
  license: WTFPL
  source: https://www.pouet.net/prod.php?which=64962
v86:
  fda:
    url: bootchess.img
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
diskImage:
  from: https://i.copy.sh/freedos722.img
  sha256: 8ecc7604d4c17c16e136d219a92e64747196d9ae044690e90be9ca0468b1ff12
  license: GPL-2.0 and the licenses of its programs
  source: https://www.ibiblio.org/pub/micro/pc-stuff/freedos/files/
v86:
  fda:
    url: freedos722.img
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
diskImage:
  from: https://i.copy.sh/kolibri.img
  sha256: f3ec74d5b70e5b7a8b0d053a1ada738a75159366b50af8a427845f87e0a91be5
  license: GPL-2.0
  source: https://git.kolibrios.org/KolibriOS/kolibrios
v86:
  fda:
    url: kolibri.img
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
diskImage:
  from: https://www.helenos.org/releases/HelenOS-0.14.1-ia32.iso
  sha256: 1b15da0459cbfe28a6d3058675c2c20a4b03584cfb4d034c0ccb17b521791ccb
  license: BSD, with some GPL components
  source: https://www.helenos.org/releases/HelenOS-0.14.1-src.tar.bz2
v86:
  memory_size: 268435456
  cdrom:
    url: HelenOS-0.14.1-ia32.iso
    size: 25792512
    async: false
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
diskImage:
  from: https://github.com/ghaerr/elks/releases/download/v0.9.2/hd32-fat.img
  sha256: d588b4e1ef7eb023270bcb5e1e9b0362cba968fb42098456a7bd2c4fb9f5817d
  license: GPL-2.0
  source: https://github.com/ghaerr/elks/tree/v0.9.2
v86:
  hda:
    url: elks-0.9.2-hd32-fat.img
    size: 32514048
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
copyShProfile: windows1
```

If a source URL doesn't load, find the page it refers to and use that address instead.

- [ ] **Step 2: Fetch the images and take the screenshots**

Run `npm run images` (expected: `8 images`), then in the background: `npm run screenshots -- --only=sectorlisp,floppybird,bootchess,freedos,kolibrios,helenos,elks,windows1 --write`.
Expected: one `PASS` or `FAIL` line per exhibit and a final count.

For each PASS, open its PNG: it must show the exhibit's own screen (a prompt, desktop, or game), not a BIOS or boot-loader message; otherwise raise `screenshotWaitSeconds` and rerun that exhibit. For a FAIL, rerun once with a longer wait; if it still fails, delete its Markdown file and note the exhibit and reason for the pull request.

- [ ] **Step 3: Confirm the things to try**

In the preview, boot each hosted exhibit and try every `tryThis` entry; for Windows 1.01, try them on its copy.sh page. Replace any entry that doesn't work as written.

- [ ] **Step 4: Verify and commit**

Run: `npm run lint; npm run typecheck; npm test; npm run build`
Expected: all exit 0; `grep -rn "<" src/content/exhibits/*.md` prints no angle-bracket prompts.

```bash
git add src/content/exhibits
git commit -m "feat: add the first exhibits: boot-sector programs, FreeDOS, KolibriOS, HelenOS, ELKS and Windows 1.01"
```

---

### Task 8: End-to-end tests

**Files:**
- Create: `playwright.config.ts`, `e2e/site.spec.ts`
- Modify: `package.json` (`lint` covers `e2e`), `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the page ids and texts from Tasks 5 and 6; exhibits `tetros` (hosted, boot-sector), a `dos` exhibit (`freedos`), and a proprietary copy.sh exhibit (`windows1`). If Task 7 left one out, use another included exhibit of the same kind.

- [ ] **Step 1: Write the Playwright config and tests**

`playwright.config.ts`: `testDir: "e2e"`, 5-minute timeout, Desktop Chrome, `baseURL` `http://localhost:4321<BASE_PATH or /RetroMuseum/>`, web server `npm run preview` on that URL (reused outside CI).

`e2e/site.spec.ts`:
1. **the hall steps through the collection:** **Next** changes `#featured-title`; **Previous** restores it.
2. **the family filter shows only matching exhibits:** after **Boot-sector**, visible cards are all `boot-sector` and a `dos` card is hidden.
3. **an exhibit page has its own title and preview image:** `exhibits/tetros/` has title "RetroMuseum: TetrOS" and an `og:image` matching `^https://hammadshakeelai\.github\.io/.+\.png$`.
4. **copyrighted exhibits say where they run and link there:** `exhibits/windows1/` shows the copyright label, and the **Run it on copy.sh** link's `href` is `https://copy.sh/v86/?profile=windows1`.
5. **an unknown page shows File not found:** the text and the **Back to the exhibit hall** link are visible.
6. **Boot it runs TetrOS from the site's own images, and Stop brings back the poster:** record requests; press **Boot it**; poll the `.v86-screen canvas` until more than 1000 pixels are lit (2-minute timeout); a request path ends with `/images/tetros.img` and no request goes to `i.copy.sh`; **Stop** brings back **Boot it**.

`package.json` `lint` becomes `oxlint --deny-warnings src scripts e2e`. In `ci.yml`, after `- run: npm run build`:
```yaml
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

- [ ] **Step 2: Run the tests**

Run: `npm run images; npm run build; npm run test:e2e`
Expected: 6 passed. If test 5 fails only because `astro preview` doesn't serve `404.html`, confirm `dist/404.html` exists and adjust only the test's navigation (GitHub Pages serves `404.html`).

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
- Consumes: `readExhibits` (`scripts/exhibits.ts`), `diskOf`, `type V86Block`, `type DiskImage`.
- Produces: `type Fetcher = (url: string, init: RequestInit) => Promise<Response>`, `MAIN_JS_URL` (`https://raw.githubusercontent.com/copy/v86/master/src/browser/main.js`), `checkImageUrl(url: string, size: number, fetcher?: Fetcher): Promise<string | null>`, `profileIds(mainJs: string): Set<string>`, `checkExhibits(dir: string, siteUrl: string, fetcher?: Fetcher): Promise<string[]>`; `exhibit-health.md` when something is broken.

- [ ] **Step 1: Write the failing tests**

`scripts/exhibit-health.test.ts`, with a fake fetcher:
- `checkImageUrl` asks for `Range: bytes=0-0` with no `Origin` or `Referer`, and accepts a 206 whose `Content-Range` total is the size, or a 200 whose `Content-Length` is the size;
- it reports `HTTP 404`, a size mismatch as `<n> bytes, expected <size>`, and a network error's message;
- `profileIds` finds every `id: "<name>"` in a profile list;
- `checkExhibits` checks a hosted exhibit's origin and `<siteUrl>images/<file>`, and a copy.sh exhibit against `MAIN_JS_URL` (fetched once), returning lines `- **<slug>**: origin <url> (<problem>)`, `- **<slug>**: site <url> (<problem>)`, and `- **<slug>**: v86 has no profile "<id>"`, and `- v86's profile list didn't load (<problem>)` when `main.js` fails.

Run: `npx vitest run scripts/exhibit-health.test.ts`
Expected: FAIL, "Failed to load url ./exhibit-health.ts".

- [ ] **Step 2: Write the script, workflow, and issue template**

Run directly, `scripts/exhibit-health.ts` checks `src/content/exhibits` against `SITE_URL` (default `https://hammadshakeelai.github.io/RetroMuseum/`). With no problems it prints "Every hosted disk image and copy.sh profile checked out." Otherwise it writes `exhibit-health.md` and exits 1. The report opens with "These exhibits have a problem:", lists the lines, then says: "A hosted exhibit whose origin is gone keeps working until the image cache expires: fix its diskImage.from or remove the exhibit. A copy.sh exhibit whose profile is gone no longer opens: update copyShProfile or remove the exhibit."

`.github/workflows/exhibit-health.yml`: name "Exhibit health"; weekly `cron: "0 6 * * 1"` and `workflow_dispatch`; permissions `contents: read`, `issues: write`; job "Check exhibits" on `ubuntu-latest` with `SITE_URL: https://hammadshakeelai.github.io/${{ github.event.repository.name }}/`. It checks out, sets up Node 24 with the npm cache, and runs `npm ci`. The check step (`node scripts/exhibit-health.ts`, `continue-on-error: true`) is followed, on failure, by a step that creates the `exhibit-health` label if missing, comments on the open `exhibit-health` issue or creates "Exhibits need attention" with `exhibit-health.md`, then fails the run.

`.github/ISSUE_TEMPLATE/removal-request.yml`: "Removal request", title prefix "Removal request: ", label `removal-request`. An intro says it is for people who hold rights to software shown in RetroMuseum, and that a valid request is handled by deleting that exhibit. Required inputs: "Exhibit" (name or page address) and "Your connection to the software". Optional: "Anything else we should know".

- [ ] **Step 3: Run the tests and the real check**

Run: `npx vitest run scripts; npm run lint; npm run typecheck`
Expected: PASS and exit 0.

Then `npm run images; npm run build`, start `npm run preview` in the background, and run `SITE_URL=http://localhost:4321/RetroMuseum/ npm run health`. Expected: "Every hosted disk image and copy.sh profile checked out." and exit 0. Stop the preview.

- [ ] **Step 4: Commit**

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
- Consumes: the built site; hosted exhibit `kolibrios` for the running screenshot (another hosted graphical exhibit if Task 7 left it out).

- [ ] **Step 1: Write the banner and the README image script**

`docs/banner.html`: a 1280×320 machine-room window titled "RetroMuseum: Exhibit hall", with the name, "Operating systems you can boot in your browser, with their stories.", and a shelf of six included exhibits with a short note each. `scripts/readme-images.ts` renders the banner at 2× to `docs/banner.png`, captures the hall at 1280×860 to `docs/screenshots/hall.png`, and boots `kolibrios` for 45 seconds to capture `docs/screenshots/exhibit.png`, from a running preview.

Run: `npm run images; npm run build`, the preview in the background, `npm run readme-images`, then stop the preview. Open each PNG: the banner is sharp and uncropped, the hall shows the placard and strip, and the exhibit shows KolibriOS's desktop with the toolbar.

- [ ] **Step 2: Rewrite the README and the notices**

`README.md`: the banner linking to the site; "**Visit:** https://hammadshakeelai.github.io/RetroMuseum/"; one paragraph on what RetroMuseum is; both screenshots. Then:
- **Visiting**: the hall, All exhibits with its families, and exhibit pages. Small open-source exhibits boot on their page with **Boot it**; the rest open on copy.sh with **Run it on copy.sh**. Every exhibit passed the screenshot check before it was added.
- **Copyrighted exhibits**: they run on copy.sh, the v86 project's site; RetroMuseum doesn't host or offer their disk images; the removal-request link.
- **Development**: Node 22.12 or newer; `npm install`, `npm run images`, `npm run dev`, `npm test`, `npm run typecheck`, `npm run build && npm run test:e2e`.
- **Adding an exhibit**: create `src/content/exhibits/<slug>.md` from v86's profile, as a hosted exhibit (open-source, no snapshot, at most 100 MB, with `diskImage` and `v86`) or a copy.sh exhibit (`copyShProfile`). Write its story, facts, and things to try from its sources. Run `npm run images` and `npm run screenshots -- --only=<slug> --write`, and check the screenshot. A weekly workflow checks image origins, the live site, and copy.sh profiles.
- **License**: MIT; see `THIRD_PARTY_NOTICES.md`.

`THIRD_PARTY_NOTICES.md`:
- v86 0.5.460 with its BSD-2-Clause text.
- SeaBIOS and SeaVGABIOS `rel-1.16.2`, LGPL v3, source.
- **Operating systems hosted on this site**: a table of each hosted exhibit's image file, where it was downloaded from, its license, and its source code, taken from the exhibit files. Each system remains under its own license.
- **Operating systems on copy.sh**: the other exhibits open on copy.sh; RetroMuseum doesn't host their images. The Windows, MS-DOS, 86-DOS, and BeOS exhibits are copyrighted software, shown for their history.

- [ ] **Step 3: Final local checks**

Run: `npm run lint; npm run typecheck; npm test; npm run images; npm run build; npm run test:e2e`
Expected: all exit 0, 6 end-to-end tests passed.

- [ ] **Step 4: Commit, push, and open the pull request**

```bash
git add README.md THIRD_PARTY_NOTICES.md docs/banner.html docs/banner.png docs/screenshots/hall.png docs/screenshots/exhibit.png scripts/readme-images.ts
git commit -m "docs: RetroMuseum README, notices, banner and screenshots"
git push -u origin retromuseum
```

Open the pull request (`gh pr create -R hammadshakeelai/WebOS --base master --head retromuseum --title "RetroMuseum: replace WebOS with a museum of operating systems"`). The body covers:
- the spec and plan paths;
- the pages;
- hosted exhibits booting from the site's own images, and copy.sh exhibits linking out, with why (spec section 12);
- the included exhibits and any left out, with reasons;
- the health check and the removal template;
- the removal of the old app;
- the base path following the repo name.

It ends with the Claude Code line.

- [ ] **Step 5: Wait for CI, merge, and check the deploy**

`gh pr checks -R hammadshakeelai/WebOS retromuseum --watch`; confirm the `github-pages` environment policy still lists `master`. If CI fails, read the failed log, fix, commit, push. Merge from outside the repo folder with `gh pr merge -R hammadshakeelai/WebOS retromuseum --squash`, and wait for the Deploy run of the merge commit.

On `https://hammadshakeelai.github.io/WebOS/` in the Browser pane:
- the hall loads;
- `exhibits/` filters;
- `exhibits/tetros/` boots TetrOS from `/WebOS/images/tetros.img`;
- `exhibits/kolibrios/` boots;
- `exhibits/windows1/` shows the copyright label and its copy.sh link opens the profile;
- `about/` links to the removal request;
- `exhibits/nope/` shows File not found.

---

### Task 11: The rest of the collection

**Files:**
- Create: `src/content/exhibits/{duskos,oberon,sortix,86dos,msdos,windows2,windows31,windows95,windows98,windowsnt4,windows2000,unix-v7,minix,openbsd,netbsd,dsl,beos,haiku,serenity,redox}.md` and their screenshots

**Interfaces:**
- Consumes: Task 7's authoring rules, the collection schema, `npm run images`, `npm run screenshots`.

- [ ] **Step 1: Branch from the merged master**

```bash
git switch master
git pull --ff-only
git switch -c exhibits-2
```

- [ ] **Step 2: Write the twenty files with these exact settings**

Follow Task 7's authoring rules. For a copy.sh exhibit that resumes from a snapshot on copy.sh, the year and version come from the system shown after resuming.

Hosted:

`duskos.md`:
```yaml
title: Dusk OS
family: independent
license: open-source
screenshotWaitSeconds: 60
homepage: http://duskos.org/
sources:
  - http://duskos.org/
diskImage:
  from: https://i.copy.sh/duskos.img
  sha256: 5b0633abf967bdea319a454126da687db3ee7e0ce6636c2e0665d00fe406f51a
  license: CC0-1.0
  source: https://git.sr.ht/~vdupras/duskos
v86:
  hda:
    url: duskos.img
    size: 8388608
    async: false
```

`oberon.md`:
```yaml
title: Oberon
family: independent
license: open-source
screenshotWaitSeconds: 60
sources:
  - https://en.wikipedia.org/wiki/Oberon_(operating_system)
diskImage:
  from: https://i.copy.sh/oberon.img
  sha256: ebd5825d013c1c342c8f48b49d5a33f3ef477f1777c362bc0e5d91b75ffd1196
  license: ETH Oberon license (BSD-style)
v86:
  hda:
    url: oberon.img
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
diskImage:
  from: https://pub.sortix.org/sortix/release/1.0/builds/sortix-1.0-i686.iso
  sha256: 03d91cf60e409300f4cb7cbe115f0c86de36841386644a340457fe6ec6a535b7
  license: ISC
  source: https://pub.sortix.org/sortix/release/1.0/source/sortix-1.0.tar.xz
v86:
  memory_size: 536870912
  cdrom:
    url: sortix-1.0-i686.iso
    size: 71075840
    async: false
```

copy.sh (each file has `title`, `family`, `license`, `screenshotWaitSeconds`, optional `homepage`, `sources`, and `copyShProfile`):

| File | title | family | license | wait | homepage | sources | copyShProfile |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `86dos.md` | 86-DOS | dos | proprietary | 30 | https://www.os2museum.com/wp/pc-86-dos/ | https://en.wikipedia.org/wiki/86-DOS, https://www.os2museum.com/wp/pc-86-dos/ | 86dos |
| `msdos.md` | MS-DOS 6.22 | dos | proprietary | 90 | | https://en.wikipedia.org/wiki/MS-DOS | msdos |
| `windows2.md` | Windows 2.03 | windows | proprietary | 60 | | https://en.wikipedia.org/wiki/Windows_2.0 | windows2 |
| `windows31.md` | Windows 3.1 | windows | proprietary | 120 | | https://en.wikipedia.org/wiki/Windows_3.1 | windows31 |
| `windows95.md` | Windows 95 | windows | proprietary | 300 | | https://en.wikipedia.org/wiki/Windows_95 | windows95 |
| `windows98.md` | Windows 98 | windows | proprietary | 90 | | https://en.wikipedia.org/wiki/Windows_98 | windows98 |
| `windowsnt4.md` | Windows NT 4.0 | windows | proprietary | 300 | | https://en.wikipedia.org/wiki/Windows_NT_4.0 | windowsnt4 |
| `windows2000.md` | Windows 2000 | windows | proprietary | 120 | | https://en.wikipedia.org/wiki/Windows_2000 | windows2000 |
| `unix-v7.md` | Unix V7 | unix-bsd-linux | open-source | 120 | | https://en.wikipedia.org/wiki/Version_7_Unix, http://www.nordier.com/v7x86/ | unix-v7 |
| `minix.md` | Minix | unix-bsd-linux | open-source | 300 | https://www.minix3.org/ | https://en.wikipedia.org/wiki/Minix, https://www.minix3.org/ | minix |
| `openbsd.md` | OpenBSD | unix-bsd-linux | open-source | 120 | https://www.openbsd.org/ | https://en.wikipedia.org/wiki/OpenBSD, https://www.openbsd.org/ | openbsd |
| `netbsd.md` | NetBSD | unix-bsd-linux | open-source | 300 | https://www.netbsd.org/ | https://en.wikipedia.org/wiki/NetBSD, https://www.netbsd.org/ | netbsd |
| `dsl.md` | Damn Small Linux | unix-bsd-linux | open-source | 240 | http://www.damnsmalllinux.org/ | https://en.wikipedia.org/wiki/Damn_Small_Linux, http://www.damnsmalllinux.org/ | dsl |
| `beos.md` | BeOS 5 | independent | proprietary | 300 | | https://en.wikipedia.org/wiki/BeOS | beos |
| `haiku.md` | Haiku | independent | open-source | 180 | https://www.haiku-os.org/ | https://en.wikipedia.org/wiki/Haiku_(operating_system), https://www.haiku-os.org/ | haiku |
| `serenity.md` | SerenityOS | independent | open-source | 180 | https://serenityos.org/ | https://en.wikipedia.org/wiki/SerenityOS, https://serenityos.org/ | serenity |
| `redox.md` | Redox | independent | open-source | 180 | https://www.redox-os.org/ | https://en.wikipedia.org/wiki/Redox_(operating_system), https://www.redox-os.org/ | redox |

- [ ] **Step 3: Take the screenshots in batches**

Run `npm run images` (expected: all hosted images), then each batch in the background:
```bash
npm run screenshots -- --only=duskos,oberon,sortix --write
npm run screenshots -- --only=86dos,msdos,windows2,windows31,windows95,windows98,windowsnt4,windows2000 --write
npm run screenshots -- --only=unix-v7,minix,openbsd,netbsd,dsl --write
npm run screenshots -- --only=beos,haiku,serenity,redox --write
```

Review every PNG as in Task 7 Step 2, raise waits where the screen shows an earlier boot stage, and leave out exhibits that still fail.

- [ ] **Step 4: Confirm the things to try, verify, and commit**

Try every `tryThis` entry: hosted exhibits in the preview, copy.sh exhibits on their copy.sh page. Fix any that don't work.

Run: `npm run lint; npm run typecheck; npm test; npm run images; npm run build; npm run test:e2e`, then the health check against the preview as in Task 9 Step 3.
Expected: all exit 0.

```bash
git add src/content/exhibits
git commit -m "feat: add the rest of the collection"
git push -u origin exhibits-2
```

Open a pull request (`gh pr create -R hammadshakeelai/WebOS --base master --head exhibits-2 --title "Add the rest of the exhibits"`). Its body lists the included exhibits (hosted or copy.sh, with download sizes) and any left out with reasons, and ends with the Claude Code line. Wait for "Lint, test, and build", merge with `gh pr merge -R hammadshakeelai/WebOS exhibits-2 --squash` from outside the repo folder, and wait for Deploy. On `https://hammadshakeelai.github.io/WebOS/`, check that Sortix boots on its page, and that Windows 98 and Haiku link to their copy.sh profiles.

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
for path in "" exhibits/ exhibits/tetros/ about/ images/tetros.img; do curl -s -o /dev/null -w "%{http_code} /RetroMuseum/$path\n" "https://hammadshakeelai.github.io/RetroMuseum/$path"; done
curl -s "https://hammadshakeelai.github.io/RetroMuseum/exhibits/nope/" | grep -c "The page you asked for isn't in the collection."
```

Expected: `200` for all five; `1` for the not-found text.

In the Browser pane, open `https://hammadshakeelai.github.io/RetroMuseum/`:
- step through the hall;
- filter by Windows;
- boot TetrOS and Sortix;
- open Windows 95's copy.sh link;
- confirm the About page's removal link opens the form on `hammadshakeelai/RetroMuseum`.

- [ ] **Step 5: Run the health check once**

```bash
gh workflow run exhibit-health.yml -R hammadshakeelai/RetroMuseum --ref master
```

Wait for it; expected: success, and no `exhibit-health` issue opened.

- [ ] **Step 6: Check "Done means" (spec section 11)**

- Every shipped exhibit passed the screenshot script's check (Tasks 7 and 11).
- The hall, All exhibits, and exhibit pages work at desktop and phone widths (check `mobile` in the Browser pane).
- Every proprietary exhibit shows the copyright label and links to copy.sh; the removal-request template exists.
- Every hosted exhibit names its disk image's license; `THIRD_PARTY_NOTICES.md` lists each image with its origin and source.
- The About page credits v86 and copy.sh.
- CI, Deploy, and Exhibit health are green.
- The README has a banner and screenshots.

Report anything that isn't true, with what's left to do.
