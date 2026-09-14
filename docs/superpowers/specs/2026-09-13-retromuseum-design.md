# RetroMuseum: Design Spec

| | |
| --- | --- |
| **Status** | Approved design, revised during the build (section 12) |
| **Date** | 2026-09-13 |
| **Repo** | `hammadshakeelai/RetroMuseum` (the current `hammadshakeelai/WebOS`, renamed; branch `master`) |
| **Live site** | `https://hammadshakeelai.github.io/RetroMuseum/` |
| **Sister project** | LinuxWeb (see `2026-09-13-linuxweb-design.md`) |

## 1. What it is

RetroMuseum is a museum of operating systems you can boot in your browser. Each exhibit is a real OS, running in the v86 emulator, presented with its story, its facts, and things to try.

It replaces the current WebOS "Browser Linux Lab" in the same repo.

### Goals

- A curated collection of up to 29 exhibits that reliably start.
- A home page that feels like walking into a museum hall, one exhibit at a time.
- A real page and link for every exhibit, so any one of them can be shared.
- Accurate, sourced history for every exhibit.
- Adding an exhibit means adding one Markdown file and a screenshot, with no code changes.

### Non-goals (v1)

- Saving or resuming a machine. Visits are short; saving belongs to LinuxWeb.
- Networking inside exhibits.
- Hosting copyrighted disk images, or any image over 100 MB, on RetroMuseum's own site.
- User accounts, comments, or ratings.

## 2. Decisions made during brainstorming

| Topic | Decision |
| --- | --- |
| Old WebOS repo | Rebuilt as RetroMuseum, repo renamed; the old `/WebOS/` site address stops working |
| Collection | Includes proprietary classics (Windows, MS-DOS, BeOS), which run on copy.sh, v86's own site |
| Home page | "Exhibit hall": one featured exhibit at a time, with a strip of the others |
| Finding exhibits | An "All exhibits" grid with family filters, alongside the hall |
| Booting | Small open-source exhibits boot on their own page, from disk images RetroMuseum hosts. The others have the same exhibit page, and its button opens the system on copy.sh (section 5) |
| Look | "Machine room": putty-beige plastic, bevelled buttons, blue title bars, as if the museum ran on a 1990s PC |
| Approach | Astro static site with one Markdown file per exhibit (not a single-page app, not hand-written HTML) |
| Saving | None in v1 |

## 3. Site structure

Astro static site, TypeScript, no UI framework. The emulator is a client-side script that loads only on hosted exhibits' pages, and only when **Boot it** is pressed.

| Page | Path | Contents |
| --- | --- | --- |
| Exhibit Hall | `/` | One featured exhibit: screenshot in a bevelled frame, placard (name, maker, year, one-line summary), **Visit exhibit**. **Previous** / **Next** step through the collection. A scrollable thumbnail strip underneath, ordered by year |
| All exhibits | `/exhibits/` | Grid of every exhibit, filterable by family. Each card says whether the exhibit boots on its page or runs on copy.sh |
| Exhibit | `/exhibits/<slug>/` | Screen area with **Boot it** (hosted exhibits) or **Run it on copy.sh** (the others), then story, facts, things to try, sources. Its own `<title>` and preview image |
| About | `/about/` | What RetroMuseum is, credits to v86 and copy.sh, licenses and sources of the hosted disk images, how to request removal |
| Not found | `/404` | Beige "File not found" dialog with a link back to the hall |

Families: **DOS**, **Windows**, **Unix, BSD & Linux**, **Independent**, **Boot-sector**.

The v86 runtime (`libv86.js`, `v86.wasm`) is copied from the npm `v86` package into the build output. The BIOS files (`seabios.bin`, `vgabios.bin`) are committed under `public/bios/`.

Hosted disk images are served from the site's `images/` folder but are not committed. `npm run images` downloads each one from the origin recorded in its exhibit file into `public/images/` (ignored by git) and checks its size and SHA-256. The CI and deploy workflows run it before building.

## 4. Content model

One Markdown file per exhibit in `src/content/exhibits/<slug>.md`, validated by an Astro content collection schema at build time. A missing or invalid field fails the build.

There are two kinds of exhibit, with one schema. A **hosted** exhibit has `diskImage` and `v86`. A **copy.sh** exhibit has `copyShProfile` instead. An exhibit with both, or with neither, fails the build.

A hosted exhibit:

```yaml
---
title: KolibriOS
maker: KolibriOS team
year: 2023
family: independent         # dos | windows | unix-bsd-linux | independent | boot-sector
license: open-source        # open-source | proprietary
summary: A graphical operating system written in assembly that fits on one floppy disk.   # max 140 chars
downloadEstimateMB: 2       # measured by the screenshot script
screenshotWaitSeconds: 60   # optional, default 120: how long the screenshot script waits for a screen
screenshotInput: "help\n"   # optional: what the screenshot script types after waiting, 30 seconds before the photo
facts:
  Boot media: 1.44 MB floppy
tryThis:
  - Open the file manager from the menu
homepage: https://kolibrios.org/en/   # optional
screenshot: ./screenshots/kolibrios.png
sources:                    # at least one
  - https://en.wikipedia.org/wiki/KolibriOS
diskImage:
  from: https://i.copy.sh/kolibri.img       # where npm run images downloads it
  sha256: 0123…                              # 64 hex characters
  license: GPL-2.0                           # shown on the page and in the notices
  source: https://git.kolibrios.org/KolibriOS/kolibrios   # optional: the image's source code
v86:                        # boot settings, taken from v86's src/browser/main.js
  fda:
    url: kolibri.img        # a file name in the site's images/ folder
    size: 1474560
---

The story: a few short paragraphs, written from the sources above.
```

A copy.sh exhibit has the same fields up to `sources`, then:

```yaml
copyShProfile: windows95    # its page links to https://copy.sh/v86/?profile=windows95
```

The `v86` block accepts the subset of v86 constructor options the hosted exhibits use: `memory_size`, `vga_memory_size`, `fda`, `cdrom`, `hda` (each with `url`, a file name, and optional `size` and `async`), `acpi`, `boot_order`, and `cpuid_level`. It has exactly one disk, whose `size` is the image's size in bytes. The page passes the block to v86 with that disk's `url` prefixed by the site's `images/` address, adding only `wasm_path`, `bios`, `vga_bios`, `screen` (the screen container, with v86's HTML text mode, as on v86's own site), and `autostart`.

When copying a profile from v86's `src/browser/main.js`: arithmetic such as `64 * 1024 * 1024` is written out as a number, the disk's `host + "name"` becomes the file name, and `mac_address_translation` is dropped because exhibits have no network. A copy.sh exhibit takes the profile's `id` as its `copyShProfile`.

The example values above are illustrative. Every real exhibit's facts, story, and year come from its listed sources, and its boot settings from v86's own configuration for that profile.

## 5. The v1 collection

### Why most exhibits run on copy.sh

On 2026-09-13, `i.copy.sh` answered HTTP 403 to disk-image requests whose `Referer` was another site (tested with `localhost` and `hammadshakeelai.github.io`), and 200 or 206 to requests with no `Referer` or a copy.sh one. It keeps other sites from loading its images, so RetroMuseum never loads them from a visitor's browser, and doesn't hide its `Referer` to get around the rule.

GitHub Pages answers `Range` requests with 206 and `Accept-Ranges: bytes` (checked on the LinuxWeb site the same day), so v86 can load disk images that RetroMuseum hosts itself.

### Which exhibits are hosted

An exhibit's disk image is hosted on RetroMuseum's site only when all of these hold:

- its license allows redistribution (copyrighted systems never qualify);
- it has no snapshot, and the image is at most 100 MB;
- if its license requires source code to be offered (the GPL), that source can be downloaded from a public address, which the exhibit page links to;
- its bytes are pinned by SHA-256, and downloaded from the project's own release when one has the same image, otherwise from copy.sh's copy.

| Family | Boots on its page | Runs on copy.sh (profile id) |
| --- | --- | --- |
| DOS | FreeDOS | 86-DOS (`86dos`), MS-DOS 6.22 (`msdos`) |
| Windows | | Windows 1.01 (`windows1`), Windows 2.03 (`windows2`), Windows 3.1 (`windows31`), Windows 95 (`windows95`), Windows 98 (`windows98`), Windows NT 4.0 (`windowsnt4`), Windows 2000 (`windows2000`) |
| Unix, BSD & Linux | ELKS | Unix V7 (`unix-v7`), Minix (`minix`), OpenBSD (`openbsd`), NetBSD (`netbsd`), Damn Small Linux (`dsl`) |
| Independent | KolibriOS, HelenOS, Oberon, Sortix, Dusk OS | BeOS 5 (`beos`), Haiku (`haiku`), SerenityOS (`serenity`), Redox (`redox`) |
| Boot-sector | Floppy Bird, TetrOS, BootChess, SectorLISP | |

Damn Small Linux meets the size rule, but it offers its GPL source only by post, so it runs on copy.sh. The other copy.sh exhibits are copyrighted, larger than 100 MB, or resume from a snapshot.

### Hosted disk images

| Exhibit | Downloaded from | License | Source code |
| --- | --- | --- | --- |
| TetrOS | `github.com/daniel-e/tetros`, `tetros.img` at commit `f0ebf20` (same bytes as copy.sh's) | MIT | `github.com/daniel-e/tetros` |
| SectorLISP | `i.copy.sh/sectorlisp-friendly.bin` | ISC | `github.com/jart/sectorlisp`, branch `friendly` |
| Floppy Bird | `github.com/icebreaker/floppybird`, `build/iso/floppybird.img` at commit `5c8f3d1` (same bytes as copy.sh's) | MIT | `github.com/icebreaker/floppybird` |
| BootChess | `i.copy.sh/bootchess.img` | WTFPL | the Pouët download archive, which includes the source |
| FreeDOS | `i.copy.sh/freedos722.img` | GPL-2.0 (kernel, FreeCOM) and the licenses of its other programs | the FreeDOS files archive on ibiblio |
| KolibriOS | `i.copy.sh/kolibri.img` (auto-build r9913, 13 April 2023) | GPL-2.0 | `git.kolibrios.org/KolibriOS/kolibrios` |
| Dusk OS | `i.copy.sh/duskos.img` | CC0-1.0 | `git.sr.ht/~vdupras/duskos` |
| Oberon | `i.copy.sh/oberon.img` (ETH Oberon System 3) | BSD-style ETH Oberon license | not required by its license |
| HelenOS | `www.helenos.org/releases/HelenOS-0.14.1-ia32.iso` | BSD, with some GPL components | `www.helenos.org/releases/HelenOS-0.14.1-src.tar.bz2` |
| ELKS | `github.com/ghaerr/elks` release `v0.9.2`, `hd32-fat.img` | GPL-2.0 | `github.com/ghaerr/elks`, tag `v0.9.2` |
| Sortix | `pub.sortix.org/sortix/release/1.0/builds/sortix-1.0-i686.iso` | ISC | `pub.sortix.org/sortix/release/1.0/source/sortix-1.0.tar.xz` |

Together they are about 160 MB.

**Inclusion rule:** an exhibit ships only if the screenshot script (section 9) starts it to a non-blank screen within its `screenshotWaitSeconds`, and the screenshot passes review. An exhibit that fails is left out of the release rather than shipped broken.

## 6. Copyrighted exhibits

The proprietary exhibits are the seven Windows versions, MS-DOS 6.22, 86-DOS, and BeOS 5.

- They run on copy.sh: their exhibit page links to `https://copy.sh/v86/?profile=<id>`. RetroMuseum never loads, copies, or publishes their disk images, and there are no download buttons.
- Each of their exhibit pages shows: "Copyrighted software, shown for its history. It runs on copy.sh, the v86 project's site; RetroMuseum doesn't host it."
- The About page credits the v86 project and copy.sh, and explains how to request removal.
- Removal requests use a GitHub issue template (`.github/ISSUE_TEMPLATE/removal-request.yml`). A valid request is handled by deleting that exhibit's Markdown file and screenshot. For a hosted exhibit, that also removes its disk image from the next deploy.
- Including these exhibits carries some legal risk, which the owner accepted. These measures reduce it; they do not remove it.

## 7. The exhibit page and booting

### Hosted exhibits, before booting

- The page is a beige window titled "RetroMuseum: <exhibit title>".
- The screen area shows the exhibit's screenshot with a large bevelled **Boot it** button and one line: "Downloads as it runs, about N MB to reach the desktop." N comes from `downloadEstimateMB`.
- Story, facts, things to try, and sources follow below. Under the facts, a line names the disk image's license and links to its source code when `source` is set.
- On touch devices, a note reads "Best with a keyboard and mouse". Booting is still allowed.

### Booting and running

1. **Boot it** loads the v86 runtime, replaces the screenshot with the live screen, and shows a progress bar of megabytes downloaded, from v86's `download-progress` event.
2. The screen scales to fit its area and keeps its aspect ratio, and is never cropped. The page measures the layer v86 is showing (text or canvas) at the size v86 laid it out, and scales that layer with CSS.
3. Toolbar: **Full screen** (`requestFullscreen` on the screen container), **Capture mouse** (`lock_mouse`), **Ctrl+Alt+Del** (`keyboard_send_scancodes`), **Restart**, **Stop**.
4. Clicking the screen also captures the mouse and keyboard. A small hint says "Press Esc to release the mouse."
5. **Stop**, or leaving the page (`pagehide`), calls `destroy()`, frees the machine, and shows the screenshot again.

### copy.sh exhibits

- The same window, story, facts, things to try, and sources.
- The screen area shows the screenshot with a large bevelled **Run it on copy.sh** link to `https://copy.sh/v86/?profile=<id>`, opening in the same tab, and one line: "Opens on copy.sh, the v86 project's site, and downloads about N MB as it runs."
- The touch note is the same.

## 8. Errors and edge cases

| Situation | What the user sees |
| --- | --- |
| A disk image request fails (network error or non-200 response) | Dialog: "Couldn't load the disk image. Check your connection and try again." with **Retry** |
| A download has started but no new bytes arrive for 60 seconds | The same dialog, with **Retry** and **Stop**. Periods with no download at all (the OS is simply booting) never trigger it |
| No WebAssembly support | Plain message explaining the exhibit can't run in this browser |
| Unknown exhibit URL | The beige 404 dialog with a link to the hall |

Problems on copy.sh's own page are copy.sh's to show.

## 9. Build, deploy, testing, and migration

### Disk images

`npm run images` reads every hosted exhibit, downloads any image that is missing from `public/images/` or has the wrong SHA-256, checks the size against the `v86` disk's `size`, and deletes files in `public/images/` that no exhibit lists. It fails if a download doesn't match, or if the images total more than 500 MB (GitHub Pages sites are limited to 1 GB). The CI and deploy workflows cache `public/images/` between runs, so images are downloaded again only when they change.

### Screenshots

`npm run screenshots` runs locally, after `npm run images`. It uses Playwright and headless Chromium:

- a hosted exhibit boots in a local harness page that serves `public/`, the way the site would;
- a copy.sh exhibit opens `https://copy.sh/v86/?profile=<id>`.

It waits that exhibit's `screenshotWaitSeconds` (default 120), types its `screenshotInput` if it has one and waits 30 more seconds, photographs the emulator screen, checks that the picture isn't blank, and prints a report with each exhibit's pass or fail result and the megabytes of disk images and snapshots downloaded. With `--write` it saves each passing PNG and records the megabytes in `downloadEstimateMB`. The maintainer reviews the screenshots by eye and commits them through a normal pull request.

It runs locally on purpose: a pull request opened by a workflow using `GITHUB_TOKEN` does not trigger CI, so branch protection would block it.

### Workflows

- **`ci.yml`** (every pull request): one job named "Lint, test, and build", which is the check branch protection requires. It runs lint, type check, unit tests, `npm run images`, `astro build` (which validates every exhibit file), and the end-to-end tests.
- **`deploy.yml`** (merge to `master`): `npm run images`, build with the repository's base path, and publish to GitHub Pages.
- **`exhibit-health.yml`** (weekly, and on demand; needs `issues: write`): for each hosted exhibit, check that its origin still serves an image of the recorded size (so a deploy with an empty cache still works) and that the live site serves it; for each copy.sh exhibit, check that v86's `src/browser/main.js` still has a profile with its id. If any fail, open a GitHub issue listing the broken exhibits.

### Tests

1. **Unit tests (Vitest)** for the emulator wrapper: fit-to-area scaling, **Stop** calling `destroy()`, stall detection (fires only when a started download gets no bytes for 60 seconds), and error states; and for the image downloader and the health check, with a fake network.
2. **End-to-end tests (Playwright, headless Chromium)** against a production build:
   - the hall loads, and **Next** / **Previous** change the featured exhibit;
   - the family filter on `/exhibits/` shows only matching exhibits;
   - an exhibit page has its own `<title>` and `og:image`;
   - a copyrighted exhibit shows the copyright label and links to its copy.sh profile;
   - **Boot it** on TetrOS (512 bytes, served from the build's own `images/`) produces a non-blank screen.

Booting the larger exhibits is not part of pull-request CI; the screenshot script and the weekly health check cover them.

### Migrating WebOS to RetroMuseum

1. On a `retromuseum` branch, delete the old app: `src/`, `scripts/`, the old contents of `public/` except `public/bios/` (this removes the bundled Linux kernel image), `docs/banner/`, `docs/screenshots/`, and `docs/DEPLOYMENT.md`. Add the Astro site. Git history keeps the old code recoverable.
2. In the same branch, switch `ci.yml` and `deploy.yml` to the Astro build, keeping the CI job name "Lint, test, and build" so the required check still matches. The site's base path comes from the repository name, so the same workflows publish to `/WebOS/` before the rename and `/RetroMuseum/` after it.
3. Keep branch protection on `master`, the `github-pages` environment and its `master` deployment policy, and Dependabot.
4. Update `README.md` (new banner and screenshots), keep `LICENSE` (MIT), and update `THIRD_PARTY_NOTICES.md` to cover v86 (BSD-2-Clause), SeaBIOS/VGABIOS (LGPL-3.0), and each hosted disk image with its license and source.
5. Merge the pull request once CI passes, with the first exhibits that pass the boot check. The rest of the collection follows in a second pull request.
6. Once the new site is live at `/WebOS/`, rename the repo in GitHub settings from `WebOS` to `RetroMuseum` and run the deploy again. GitHub redirects repo links and clones; the old `/WebOS/` site address stops working.

### Shared with LinuxWeb

Both projects use the same "machine room" visual language. The theme CSS (about 150 lines) and the small v86 wrapper patterns are copied into each repo rather than packaged; two repos don't justify a shared library.

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| An origin changes or removes a hosted image | Hashes are pinned, so a deploy fails rather than publishing different bytes; the weekly check opens an issue first |
| copy.sh renames or removes a profile | The weekly check opens an issue; the exhibit is updated or removed |
| GitHub Pages limits (1 GB site, 100 GB a month soft bandwidth) | Hosted images stay under 500 MB in total and 100 MB each |
| GPL source obligations for hosted images | Each page and the notices link the exact upstream source; an image whose source isn't publicly downloadable stays on copy.sh. If a project asks, its source archive can be published next to the image |
| Legal complaint about an exhibit | Removal-request template; delete the exhibit file |
| Large exhibits are slow, especially on phones | Download estimate on the page; "Best with a keyboard and mouse" note |
| Browser shortcuts conflict with guest keys | **Ctrl+Alt+Del** button; mouse-capture hint |

## 11. Done means

- Every shipped exhibit passed the screenshot script's check.
- The hall, the All exhibits grid, and exhibit pages work at desktop and phone widths.
- Every proprietary exhibit shows the copyright label and links to copy.sh, and the removal-request template exists.
- Every hosted exhibit names its disk image's license, and `THIRD_PARTY_NOTICES.md` lists each image with its origin and source.
- The About page credits v86 and copy.sh.
- CI, deploy, and the weekly health check run green.
- The README has a banner and screenshots.

## 12. Revision history

- **2026-09-13, during the build.** The approved design loaded every disk image from `i.copy.sh` in the visitor's browser. The first screenshot run got HTTP 403, and header tests showed `i.copy.sh` refuses requests that come from other sites. The old WebOS app had avoided this with a `no-referrer` policy. The owner chose to host small open-source images on RetroMuseum's site and to link the rest to copy.sh, rather than hide the `Referer`, link every exhibit to copy.sh, or ship only open-source exhibits. This revision changed sections 1 to 11 to match; snapshots, split images, and the i.copy.sh error message left the design with it.
- **2026-09-13, while checking the first exhibits.** Screenshots of FreeDOS and ELKS showed ghosted text rows from v86's graphical text mode. On a 1920×1080 window, v86 also doubled a 320×200 canvas to twice the size of its area. The page now uses v86's HTML text mode, as v86's own site does, and scales whichever layer v86 shows with CSS after measuring it. Full screen now calls `requestFullscreen` on the screen itself, because v86's own full-screen call looks for an element RetroMuseum's pages don't have.
