# RetroMuseum: Design Spec

| | |
| --- | --- |
| **Status** | Approved design, awaiting spec review |
| **Date** | 2026-09-13 |
| **Repo** | `hammadshakeelai/RetroMuseum` (the current `hammadshakeelai/WebOS`, renamed; branch `master`) |
| **Live site** | `https://hammadshakeelai.github.io/RetroMuseum/` |
| **Sister project** | LinuxWeb (see `2026-09-13-linuxweb-design.md`) |

## 1. What it is

RetroMuseum is a museum of operating systems you can boot in your browser. Each exhibit is a real OS, running in the v86 emulator, presented with its story, its facts, and things to try.

It replaces the current WebOS "Browser Linux Lab" in the same repo.

### Goals

- A curated collection of up to 29 exhibits that reliably boot.
- A home page that feels like walking into a museum hall, one exhibit at a time.
- A real page and link for every exhibit, so any one of them can be shared.
- Accurate, sourced history for every exhibit.
- Adding an exhibit means adding one Markdown file and a screenshot, with no code changes.

### Non-goals (v1)

- Saving or resuming a machine. Visits are short; saving belongs to LinuxWeb.
- Networking inside exhibits.
- Hosting any disk images on RetroMuseum's own site.
- User accounts, comments, or ratings.

## 2. Decisions made during brainstorming

| Topic | Decision |
| --- | --- |
| Old WebOS repo | Rebuilt as RetroMuseum, repo renamed; the old `/WebOS/` site address stops working |
| Collection | Includes proprietary classics (Windows, MS-DOS, BeOS), loaded from i.copy.sh like v86's own site |
| Home page | "Exhibit hall": one featured exhibit at a time, with a strip of the others |
| Finding exhibits | An "All exhibits" grid with family filters, alongside the hall |
| Booting | Each exhibit has its own page; the OS runs on that page |
| Look | "Machine room": putty-beige plastic, bevelled buttons, blue title bars, as if the museum ran on a 1990s PC |
| Approach | Astro static site with one Markdown file per exhibit (not a single-page app, not hand-written HTML) |
| Saving | None in v1 |

## 3. Site structure

Astro static site, TypeScript, no UI framework. The emulator is a client-side script that loads only on exhibit pages, and only when **Boot it** is pressed.

| Page | Path | Contents |
| --- | --- | --- |
| Exhibit Hall | `/` | One featured exhibit: screenshot in a bevelled frame, placard (name, maker, year, one-line summary), **Visit exhibit**. **Previous** / **Next** step through the collection. A scrollable thumbnail strip underneath, ordered by year |
| All exhibits | `/exhibits/` | Grid of every exhibit, filterable by family |
| Exhibit | `/exhibits/<slug>/` | Screen area with **Boot it**, then story, facts, things to try, sources. Its own `<title>` and preview image |
| About | `/about/` | What RetroMuseum is, credits to v86 and copy.sh, licenses, how to request removal |
| Not found | `/404` | Beige "File not found" dialog with a link back to the hall |

Families: **DOS**, **Windows**, **Unix, BSD & Linux**, **Independent**, **Boot-sector**.

The v86 runtime (`libv86.js`, `v86.wasm`) is copied from the npm `v86` package into the build output. The BIOS files (`seabios.bin`, `vgabios.bin`) are committed under `public/bios/`.

## 4. Content model

One Markdown file per exhibit in `src/content/exhibits/<slug>.md`, validated by an Astro content collection schema at build time. A missing or invalid field fails the build.

```yaml
---
title: Windows 95
maker: Microsoft
year: 1995
family: windows            # dos | windows | unix-bsd-linux | independent | boot-sector
license: proprietary        # open-source | proprietary
summary: Introduced the Start button and the taskbar.   # one line, max 140 chars
downloadEstimateMB: 40      # measured by the screenshot script
screenshotWaitSeconds: 180  # optional, default 120: how long the screenshot script waits for a screen
facts:
  disk: 450 MB
  memory: 64 MB
tryThis:
  - Open Paint from the Start menu
  - Play Minesweeper
homepage: https://en.wikipedia.org/wiki/Windows_95   # optional
screenshot: ./screenshots/windows-95.png
sources:                    # at least one
  - https://en.wikipedia.org/wiki/Windows_95
v86:                        # boot settings, taken from v86's src/browser/main.js
  memory_size: 67108864
  hda:
    url: https://i.copy.sh/windows95-v3/.img
    size: 471859200
    use_parts: true
    fixed_chunk_size: 262144
---

The story: a few short paragraphs, written from the sources above.
```

The `v86` block accepts the subset of v86 constructor options the collection uses: `memory_size`, `vga_memory_size`, `fda`, `cdrom`, `hda` (each with `url` and optional `size`, `use_parts`, `fixed_chunk_size`, `async`), `initial_state` (with `url`), `acpi`, and `boot_order`. The page passes the block to v86 unchanged, adding only `wasm_path`, `bios`, `vga_bios`, and `screen_container`.

The example values above are illustrative. Every real exhibit's facts, story, and year come from its listed sources, and its `v86` block from v86's own configuration for that profile.

## 5. The v1 collection

All 29 were checked on 2026-09-13: each disk image and snapshot loads from i.copy.sh with HTTP 200 and `Access-Control-Allow-Origin: *`.

| Family | Exhibits (v86 profile id) |
| --- | --- |
| DOS | 86-DOS (`86dos`), MS-DOS 6.22 (`msdos`), FreeDOS (`freedos`) |
| Windows | Windows 1.01 (`windows1`), Windows 2.03 (`windows2`), Windows 3.1 (`windows31`), Windows 95 (`windows95`), Windows 98 (`windows98`), Windows NT 4.0 (`windowsnt4`), Windows 2000 (`windows2000`) |
| Unix, BSD & Linux | Unix V7 (`unix-v7`), Minix (`minix`), OpenBSD (`openbsd`), NetBSD (`netbsd`), ELKS (`elks`), Damn Small Linux (`dsl`) |
| Independent | BeOS 5 (`beos`), KolibriOS (`kolibrios`), Haiku (`haiku`), SerenityOS (`serenity`), Redox (`redox`), HelenOS (`helenos`), Oberon (`oberon`), Sortix (`sortix`), Dusk OS (`duskos`) |
| Boot-sector | Floppy Bird (`floppybird`), TetrOS (`tetros`), BootChess (`bootchess`), SectorLISP (`sectorlisp`) |

**Inclusion rule:** an exhibit ships only if the screenshot script (section 9) boots it to a non-blank screen within its `screenshotWaitSeconds`, and the screenshot passes review. An exhibit that fails is left out of the release rather than shipped broken.

## 6. Copyrighted exhibits

The proprietary exhibits are the seven Windows versions, MS-DOS 6.22, 86-DOS, and BeOS 5.

- Their disk images load directly from i.copy.sh when **Boot it** is pressed. They are never copied into the repo or published on RetroMuseum's site, and there are no download buttons.
- Each of their exhibit pages shows: "Copyrighted software, shown for its history. The disk image loads from copy.sh, the v86 project's server."
- The About page credits the v86 project and copy.sh, and explains how to request removal.
- Removal requests use a GitHub issue template (`.github/ISSUE_TEMPLATE/removal-request.yml`). A valid request is handled by deleting that exhibit's Markdown file and screenshot.
- Including these exhibits carries some legal risk, which the owner accepted. These measures reduce it; they do not remove it.

Open-source exhibits also load from i.copy.sh in v1, for consistency. Hosting small open-source images on the site is a possible later change.

## 7. The exhibit page and booting

### Before booting

- The page is a beige window titled "RetroMuseum: <exhibit title>".
- The screen area shows the exhibit's screenshot with a large bevelled **Boot it** button and one line: "Downloads as it runs, about N MB to reach the desktop." N comes from `downloadEstimateMB`.
- Story, facts, things to try, and sources follow below.
- On touch devices, a note reads "Best with a keyboard and mouse". Booting is still allowed.

### Booting and running

1. **Boot it** loads the v86 runtime, replaces the screenshot with the live screen, and shows a progress bar of megabytes downloaded, from v86's `download-progress` event.
2. Exhibits with a snapshot (`initial_state`) resume straight to their desktop. The others boot normally.
3. The screen scales to fit its area and keeps its aspect ratio (`screen_set_scale`), and is never cropped.
4. Toolbar: **Full screen** (`screen_go_fullscreen`), **Capture mouse** (`lock_mouse`), **Ctrl+Alt+Del** (`keyboard_send_scancodes`), **Restart**, **Stop**.
5. Clicking the screen also captures the mouse and keyboard. A small hint says "Press Esc to release the mouse."
6. **Stop**, or leaving the page (`pagehide`), calls `destroy()`, frees the machine, and shows the screenshot again.

## 8. Errors and edge cases

| Situation | What the user sees |
| --- | --- |
| A disk image or snapshot request fails (network error or non-200 response) | Dialog: "Couldn't reach the disk image server (i.copy.sh). It may be busy; try again in a minute." with **Retry** |
| A download has started but no new bytes arrive for 60 seconds | The same dialog, with **Retry** and **Stop**. Periods with no download at all (the OS is simply booting) never trigger it |
| No WebAssembly support | Plain message explaining the exhibit can't run in this browser |
| Unknown exhibit URL | The beige 404 dialog with a link to the hall |

## 9. Build, deploy, testing, and migration

### Screenshots

`npm run screenshots` runs locally. It uses Playwright to boot each exhibit headlessly, waits up to that exhibit's `screenshotWaitSeconds` (default 120) for a non-blank screen, saves a PNG, and prints a report with each exhibit's pass or fail result and the megabytes downloaded. The maintainer copies the megabytes into `downloadEstimateMB`, reviews the screenshots by eye, and commits them through a normal pull request.

It runs locally on purpose: a pull request opened by a workflow using `GITHUB_TOKEN` does not trigger CI, so branch protection would block it.

### Workflows

- **`ci.yml`** (every pull request): one job named "Lint, test, and build", which is the check branch protection requires. It runs lint, type check, unit tests, `astro build` (which validates every exhibit file), and the end-to-end tests.
- **`deploy.yml`** (merge to `master`): build with the `/RetroMuseum/` base path and publish to GitHub Pages.
- **`exhibit-health.yml`** (weekly, and on demand; needs `issues: write`): request every exhibit's disk image (the first part, for split images) and snapshot from i.copy.sh. If any fail, open a GitHub issue listing the broken exhibits.

### Tests

1. **Unit tests (Vitest)** for the emulator wrapper: fit-to-area scaling, **Stop** calling `destroy()`, stall detection (fires only when a started download gets no bytes for 60 seconds), and error states.
2. **End-to-end tests (Playwright, headless Chromium)** against a production build:
   - the hall loads, and **Next** / **Previous** change the featured exhibit;
   - the family filter on `/exhibits/` shows only matching exhibits;
   - an exhibit page has its own `<title>` and `og:image`;
   - **Boot it** on TetrOS (about 1 MB) produces a non-blank screen.

Booting large exhibits is not part of pull-request CI. It is slow and depends on i.copy.sh; the weekly health check and the screenshot script cover it.

### Migrating WebOS to RetroMuseum

1. Rename the repo in GitHub settings from `WebOS` to `RetroMuseum`. GitHub redirects repo links and clones.
2. On a `retromuseum` branch, delete the old app: `src/`, `scripts/`, the old contents of `public/` (including the bundled Linux kernel image), `docs/banner/`, `docs/screenshots/`, and `docs/DEPLOYMENT.md`. Add the Astro site, including its own `public/bios/`. Git history keeps the old code recoverable.
3. In the same branch, switch `ci.yml` and `deploy.yml` to the Astro build, keeping the CI job name "Lint, test, and build" so the required check still matches. The pull request's own checks then exercise the new site.
4. Keep branch protection on `master`, the `github-pages` environment and its `master` deployment policy, and Dependabot.
5. Update `README.md` (new banner and screenshots), keep `LICENSE` (MIT), and update `THIRD_PARTY_NOTICES.md` to cover v86 (BSD-2-Clause) and SeaBIOS/VGABIOS (LGPL-3.0). Removing the bundled Linux kernel image also removes the old GPL source obligation.
6. Merge the pull request once CI passes.

### Shared with LinuxWeb

Both projects use the same "machine room" visual language. The theme CSS (about 150 lines) and the small v86 wrapper patterns are copied into each repo rather than packaged; two repos don't justify a shared library.

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| i.copy.sh changes or removes an image | Weekly health check opens an issue; affected exhibits can be removed |
| Legal complaint about a proprietary exhibit | Removal-request template; delete the exhibit file |
| Large exhibits are slow, especially on phones | Download estimate on the page; "Best with a keyboard and mouse" note |
| Browser shortcuts conflict with guest keys | **Ctrl+Alt+Del** button; mouse-capture hint |

## 11. Done means

- Every shipped exhibit passed the screenshot script's boot check.
- The hall, the All exhibits grid, and exhibit pages work at desktop and phone widths.
- Every proprietary exhibit shows the copyright label, and the removal-request template exists.
- The About page credits v86 and copy.sh.
- CI, deploy, and the weekly health check run green.
- The README has a banner and screenshots.
