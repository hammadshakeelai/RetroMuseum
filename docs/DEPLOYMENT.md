# Deployment Plan: Browser Linux Lab (WebOS)

| | |
| --- | --- |
| **Live URL** | https://hammadshakeelai.github.io/WebOS/ |
| **Repository** | https://github.com/hammadshakeelai/WebOS (public) |
| **Host** | GitHub Pages, deployed by GitHub Actions |
| **Last updated** | 2026-09-13 |

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Repo visibility | Public | GitHub Pages is free for public repos. |
| Hosting | GitHub Pages | The app is fully static and the workflow already existed. |
| Base path | `/WebOS/` | Set from the repo name in `deploy.yml`. **Renaming the repo changes both the URL and the base path.** |
| Deploy branch | `master` | Allowed through the `github-pages` environment's branch policy (see Phase 1, step 3). |
| OS images | Keep loading from `i.copy.sh` for v1 | Mirroring is Phase 3. |
| License | MIT, plus [third-party notices](../THIRD_PARTY_NOTICES.md) | |
| Branch protection | Pull requests only, CI must pass, admins included | Every change to the live site gets a green CI run first. |
| Micro Linux kernel | Relabel as Linux 5.6 now; build our own image later | The bundled image's exact build configuration was never published, so only a rebuild fully meets the GPL. |

## How a deploy works

```
push to master
  └─ GitHub Actions: deploy.yml
       ├─ npm ci
       ├─ npm run lint && npm test        ← a failure stops the deploy
       ├─ npm run build  (VITE_BASE_PATH=/WebOS/)
       ├─ upload dist/ as the Pages artifact
       └─ deploy-pages                    ← live about 1–2 minutes after the push
```

**Size and traffic.** The published site is about 10 MB. A visitor's first Micro Linux boot downloads about 8 MB from Pages: the 5 MB kernel, the 2 MB v86 WASM, and the BIOS and app code. GitHub Pages has a 1 GB site limit and a soft 100 GB/month bandwidth limit, which is roughly 12,000 first-time Micro Linux boots a month. Profiles that load images from i.copy.sh use *that* server's bandwidth, not Pages'.

---

## Phase 0: Pre-flight ✅

- [x] `npm run lint`, `npm test` (77 tests), `npm run build`, and `npm run hook:all` pass
- [x] `npm audit` reports 0 vulnerabilities
- [x] Production build served under `/WebOS/` (the same base path Pages uses). Booted to a prompt or desktop: Micro Linux, Arch Linux 32 (Terminal), Linux 4.x, KolibriOS, FreeDOS. All assets returned 200 and there were no console errors.
- [x] Every `i.copy.sh` image returns `Access-Control-Allow-Origin: *`, so a hosted copy of the app can load them
- [x] Pre-publish cleanup: README corrected, hardcoded local paths removed from test scripts, MIT `LICENSE` and third-party notices added, unused `.agents/` stubs deleted

## Phase 1: Repository and first deploy ✅

1. [x] Create the public repo `hammadshakeelai/WebOS`.
2. [x] Turn on Pages with the source set to GitHub Actions:
   ```bash
   gh api -X POST repos/hammadshakeelai/WebOS/pages -f build_type=workflow
   ```
   This is a one-time step. The workflow's `configure-pages` step can't do it itself: its `enablement` option needs a token other than the default `GITHUB_TOKEN`.
3. [x] Allow `master` to deploy. Turning on Pages creates a `github-pages` environment that only accepts deploys from `main`, so a push to `master` would fail at the final step:
   ```bash
   gh api -X POST repos/hammadshakeelai/WebOS/environments/github-pages/deployment-branch-policies -f name=master -f type=branch
   ```
   If you ever rename the branch, update this policy too.
4. [x] Push `master` and watch the run with `gh run watch`. The first deploy passed in 29 seconds.
5. [x] Run the live smoke test below. Every check passed on the live site on 2026-09-13.

### Live smoke test

Run after every deploy that changes emulator, profile, or build code.

- [x] https://hammadshakeelai.github.io/WebOS/ loads with no console errors or failed requests
- [x] **Micro Linux** boots to a `~%` prompt
- [x] **Arch Linux 32 (Terminal)** resumes to `root@localhost:~#`
- [x] **KolibriOS** reaches its desktop (checks graphics mode)
- [x] **Snapshots**: save one, reload the page, restore it
- [x] **Cyber Lab Mode** shows Station 1 and Station 2
- [x] **Mount ISO** rejects an `http://` URL (the site is HTTPS, so mixed content is blocked)

---

## Phase 2: Hardening (in progress)

| Task | Status |
| --- | --- |
| Add a `ci.yml` that runs lint, test, and build on `pull_request` | Done in [#2](https://github.com/hammadshakeelai/WebOS/pull/2). The check is named "Lint, test, and build". |
| Protect `master`: pull requests only, CI must pass, no force-pushes or deletion, admins included | Waiting until [#1](https://github.com/hammadshakeelai/WebOS/pull/1)–[#4](https://github.com/hammadshakeelai/WebOS/pull/4) merge, so those PRs aren't locked out. |
| Move the GitHub Actions in `deploy.yml` to Node 24 releases | Done in [#2](https://github.com/hammadshakeelai/WebOS/pull/2): checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5. |
| Enable Dependabot for `npm` and `github-actions` | Done in [#2](https://github.com/hammadshakeelai/WebOS/pull/2). |
| Add a `prebuild` script that runs `sync:runtime` | Done in [#2](https://github.com/hammadshakeelai/WebOS/pull/2). |
| Stop large VM screens from being cropped | Done in [#3](https://github.com/hammadshakeelai/WebOS/pull/3). KolibriOS's 1024×768 desktop now scales down to fit the viewport. |
| Correct the Micro Linux label | Done in [#4](https://github.com/hammadshakeelai/WebOS/pull/4): renamed to Linux 5.6, the version actually bundled. |
| GPL source for the bundled kernel | Upstream source links added in [#4](https://github.com/hammadshakeelai/WebOS/pull/4). The image's exact build configuration was never published, so this stays open until the image is replaced (next row). |
| Build our own Micro Linux kernel | Not started. Add a workflow that builds [chschnell/v86-buildroot](https://github.com/chschnell/v86-buildroot) at a pinned release and publishes the `bzImage` with its full source as a GitHub Release, then bundle that image. Retest `/mnt` file sharing afterwards. |
| Test the 3 untested profiles | Done. Damn Small Linux reaches its X desktop. Arch Desktop resumes to a shell and needs `./startx.sh` for Xorg (profile text corrected in [#4](https://github.com/hammadshakeelai/WebOS/pull/4)). Arch Cold Boot runs its OpenRC startup but takes more than 2 minutes; the login prompt isn't confirmed yet. |
| Start Xorg automatically in the Arch Desktop profile | Not started. Type `./startx.sh` into the guest after the snapshot resumes, then confirm the desktop appears. |
| Fix the `linux4-cli` mount error | Open. Adding `filesystem: {}` and `sharedDirectory: "/mnt"` changed the error but didn't fix it: the guest still reports no `host9p` device. The change wasn't kept, because uploads would look successful but never reach the guest. Cosmetic: the prompt still works. |
| Run `scripts/test-all-os.mjs` in CI | Not started. It needs headless Chrome on Linux (set `CHROME_PATH`), then it can run nightly against the live site. |

## Phase 3: Independence from i.copy.sh

**Why:** 7 of the 8 ready-to-boot profiles download from `i.copy.sh`, a server run by the v86 author. If it goes down, blocks other sites, or renames a file, those profiles break with no warning. Heavy traffic from this site also lands on someone else's bandwidth bill.

**What would need mirroring:**

| Asset | Size | Used by |
| --- | --- | --- |
| `arch_state-v3.bin.zst` | 15.5 MB | Arch Terminal, Arch Desktop |
| `fs.json` | 5.8 MB | Arch Cold Boot |
| `arch/` 9P file tree | 88,217 files, about 6.6 GB uncompressed | All Arch profiles |
| `dsl-4.11.rc2.iso` | 52.8 MB | Damn Small Linux |
| `linux4.iso` | 7.7 MB | Linux 4.x |
| `kolibri.img` | 1.5 MB | KolibriOS |
| `freedos722.img` | 0.7 MB | FreeDOS |

**Recommended host: Cloudflare R2.** It has no egress fees and 10 GB of free storage, which fits all of the above. It supports CORS rules and HTTP Range requests, which v86 needs.

**Ruled out:**

- **GitHub Releases:** downloads don't send CORS headers, so the browser can't fetch them.
- **The git repo itself:** 88k files and 6.6 GB would make every clone huge.

**Steps:**

1. Check the license of each image before redistributing it. Hosting GPL binaries means also offering their source.
2. Create an R2 bucket with a public custom domain and a CORS rule for `https://hammadshakeelai.github.io`.
3. Copy the small images first. Move the Arch tree last, since it's the big one.
4. Add a `VITE_IMAGE_BASE_URL` build variable that defaults to `https://i.copy.sh/`, and point `src/profiles/index.ts` at it.
5. Switch one profile at a time and re-run the smoke test.

## Phase 4: Optional

- **Custom domain:** add a CNAME in the Pages settings and DNS. The site then moves to `/`, so set `VITE_BASE_PATH=/` in `deploy.yml`.
- **Security headers:** GitHub Pages can't send a Content-Security-Policy. To get one, put Cloudflare in front, or move to Cloudflare Pages and use a `_headers` file.
- **Uptime check:** a weekly scheduled workflow that requests the live URL and each external image, and fails if one disappears.
- **Your own wsproxy relay:** internet access in the VMs currently goes through a third-party relay.
- **Privacy-friendly analytics.**

---

## Rollback

| Situation | Action |
| --- | --- |
| A bad commit is live | `git revert <sha>` and push. The workflow redeploys the previous state. |
| Need the old version back right now | Re-run the last good deploy: `gh run list --workflow deploy.yml`, then `gh run rerun <run-id>`. The next push to `master` deploys the latest commit again. |
| GitHub Pages is down | Run `VITE_BASE_PATH=/ npm run build` locally and upload `dist/` to Cloudflare Pages or Netlify as a temporary mirror. |
| i.copy.sh images stop loading | Micro Linux still works. Post a notice in the README, then start Phase 3. |

## Open decisions

- [ ] Use a custom domain, or keep `hammadshakeelai.github.io/WebOS/`?
- [ ] Do Phase 2 now, or after the site has had some use?
- [ ] When to mirror the images (Phase 3), and whether R2 is the right place?
