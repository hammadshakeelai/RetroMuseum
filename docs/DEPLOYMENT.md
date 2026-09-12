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
| OS images | Keep loading from `i.copy.sh` for v1 | Mirroring is Phase 3. |
| License | MIT, plus [third-party notices](../THIRD_PARTY_NOTICES.md) | |

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

## Phase 1: Repository and first deploy

1. [ ] Create the public repo `hammadshakeelai/WebOS`.
2. [ ] Turn on Pages with the source set to GitHub Actions:
   ```bash
   gh api -X POST repos/hammadshakeelai/WebOS/pages -f build_type=workflow
   ```
   This is a one-time step. The workflow's `configure-pages` step can't do it itself: its `enablement` option needs a token other than the default `GITHUB_TOKEN`.
3. [ ] Push `master` and watch the run: `gh run watch`.
4. [ ] Run the live smoke test below.

### Live smoke test

Run after every deploy that changes emulator, profile, or build code.

- [ ] https://hammadshakeelai.github.io/WebOS/ loads with no console errors
- [ ] **Micro Linux** boots to a `~%` prompt
- [ ] **Arch Linux 32 (Terminal)** resumes to `root@localhost:~#`
- [ ] **KolibriOS** reaches its desktop (checks graphics mode)
- [ ] **Snapshots**: save one, reload the page, restore it
- [ ] **Cyber Lab Mode** shows Station 1 and Station 2
- [ ] **Kali** opens the Mount ISO dialog instead of trying to boot
- [ ] **Mount ISO** rejects an `http://` URL (the site is HTTPS, so mixed content is blocked)

---

## Phase 2: Hardening (recommended next)

| Task | Why |
| --- | --- |
| Add a `ci.yml` that runs lint, test, and build on `pull_request` | Today checks only run on pushes to `master`, and those pushes also deploy. PRs get no feedback. |
| Protect `master`: require the CI check to pass | Stops a broken commit from deploying. |
| Enable Dependabot for `npm` and `github-actions` | Keeps v86, React, Vite, and the action versions current. |
| Add a `prebuild` script that runs `sync:runtime` | `public/v86/` is only refreshed by `npm run dev`. Syncing before build keeps it in step with `package-lock.json`. |
| Fix the `linux4-cli` profile | The guest tries to mount a 9P share at `/mnt`, but the profile defines no filesystem, so boot prints a mount error. Add `filesystem: {}` and `sharedDirectory: "/mnt"`. |
| Correct the Micro Linux label | The app calls it "Micro Linux 6.8", but `public/images/buildroot-bzimage.bin` is Linux 5.6.15 (built 2020). Update the name and description in `src/profiles/index.ts`, then the tests and scripts that match on that name. |
| Publish GPL source for the bundled kernel | The repo redistributes a GPL-2.0 kernel and BusyBox binary. GPL recipients are entitled to the exact corresponding source. Link it from `THIRD_PARTY_NOTICES.md`, or rebuild the image from a Buildroot config you commit. |
| Test the 3 untested profiles | Arch Linux 32 (Desktop), Arch Linux 32 (Cold Boot 9P), Damn Small Linux. |
| Run `scripts/test-all-os.mjs` in CI | It already sweeps 7 profiles. It needs headless Chrome on Linux (set `CHROME_PATH`), then it can run nightly against the live site. |

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
