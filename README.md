# 🌐 Browser Linux Lab (WebOS)

> A modern, client-side Linux workstation and cyber training lab powered by WebAssembly and the [v86](https://copy.sh/v86/) x86 PC emulator.

**Live demo:** https://hammadshakeelai.github.io/WebOS/

Run real operating systems directly inside your browser—**no backend servers, no Docker containers, no cloud VM costs**.

---

## ✨ Features

- **⚡ Snapshot Resume Boots**: Pre-saved memory snapshots (`.bin.zst`) resume a running Arch Linux session straight to a shell prompt, skipping the kernel boot.
- **📁 VirtIO 9P On-Demand Filesystem**: Downloads guest files over HTTP only when the guest kernel requests them, saving bandwidth.
- **🛡️ In-Browser Cyber Training Lab (Split-Screen)**: Run two VMs side by side (e.g. an attacker box and a target) connected over an isolated browser `BroadcastChannel` virtual switch.
- **💾 IndexedDB State Persistence**: Freeze, save, and restore VM memory states in browser storage, or export/import `.bin` snapshot files.
- **💿 Mount Custom Media**: Boot your own 32-bit ISO or disk image.
- **⌨️ Smart Keystrokes Deck**: Quick buttons for `Ctrl+C`, `Ctrl+Z`, `Ctrl+Alt+Del`, `Tab`, `Esc`, and `tty` console switching.
- **📋 Host-to-Guest Clipboard & Drag-and-Drop**: Paste scripts into the terminal, or drop files onto the screen to copy them into the guest (9P profiles).
- **📺 Retro CRT Filter & Display Scaling**: Switch between crisp pixel-perfect rendering and scanlines.
- **🚀 100% Static Deployment**: Deployed to GitHub Pages by GitHub Actions; also works on Cloudflare Pages or Netlify.

---

## 🐧 Operating Systems

### Ready to boot

| Profile | Type | Boot media | Image host | Verified |
| :--- | :---: | :--- | :--- | :---: |
| **Micro Linux** (default) | CLI | Bundled Linux 5.6 kernel + BusyBox | This site (works offline) | ✅ |
| **Arch Linux 32 (Terminal)** | CLI | Memory snapshot resume + 9P filesystem | i.copy.sh | ✅ |
| **Arch Linux 32 (Desktop)** | GUI | Memory snapshot resume + 9P filesystem; run `./startx.sh` for Xorg | i.copy.sh | ✅ shell |
| **Arch Linux 32 (Cold Boot 9P)** | CLI | Full kernel boot, root on 9P (slow: 2+ minutes) | i.copy.sh | ⏳ |
| **Damn Small Linux 4.11** | GUI | 53 MB live CD | i.copy.sh | ✅ |
| **Linux 4.x Minimal Live CD** | CLI | 7 MB live CD | i.copy.sh | ✅ |
| **KolibriOS** | GUI | 1.44 MB floppy | i.copy.sh | ✅ |
| **FreeDOS 1.3** | CLI | 720 KB floppy | i.copy.sh | ✅ |

✅ = booted to a shell prompt or desktop from a production build (2026-09-13). ⏳ = boot runs, but a login prompt hasn't been confirmed yet.

### Your own image

**Mount ISO** boots any 32-bit x86 `.iso`, `.img`, `.bin`, or `.raw` image from a URL or a file on your computer. v86 emulates a 32-bit CPU (Pentium 4 instruction set), so `x86_64`-only images won't boot.

> **External image host:** Profiles marked *i.copy.sh* download their images from the v86 project's public image server. It allows cross-origin loading today, but this project doesn't control it. If that changes, those profiles stop booting; Micro Linux keeps working. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the mirroring plan.

---

## 🚀 Quick Start

Requires Node.js 22.12 or newer.

### 1. Install Dependencies
```bash
git clone https://github.com/hammadshakeelai/WebOS.git
cd WebOS
npm install
```

### 2. Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. `npm run dev` also copies the v86 runtime from `node_modules` into `public/v86/`.

### 3. Production Build
```bash
npm run build
```
Generates optimized static assets in `dist/`. Set `VITE_BASE_PATH` (e.g. `/WebOS/`) when hosting under a subpath.

### 4. Quality Checks
```bash
npm run lint
npm test
npm run hook:all
```
`hook:all` runs the QA, security, UX, and lint + build hooks in `scripts/hooks/`.

---

## 🌐 Virtual Networking Modes

1. **In-Browser Mesh (BroadcastChannel)** *(Default)*:
   - Links VMs across tabs or split-screen panes locally.
   - Zero external traffic—packets stay strictly inside the browser.
2. **Offline**:
   - Complete airgap.
3. **WebSocket Relay (wsproxy)**:
   - Relays Ethernet frames through a WebSocket relay you configure, to reach the live internet. Traffic passes through whoever runs that relay.

---

## 📦 Deployment

Every push to `master` runs lint and tests, builds with the repository name as the base path, and publishes to GitHub Pages ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

The full plan (rollback, hardening, and mirroring OS images) is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 🗂️ Project Architecture

```
WebOS/
├── public/
│   ├── bios/                  # SeaBIOS and VGABIOS binaries
│   ├── images/                # Bundled offline micro-Linux kernel
│   └── v86/                   # v86.wasm & libv86.js
├── src/
│   ├── emulator/
│   │   ├── V86Engine.ts       # Core TypeScript wrapper for v86 lifecycle
│   │   ├── useV86.ts          # React hook
│   │   ├── storage.ts         # IndexedDB snapshots
│   │   ├── networking.ts      # BroadcastChannel mesh adapter
│   │   ├── security.ts        # URL, path, and snapshot validation
│   │   └── clipboard.ts       # Keystroke scancodes & typing bridge
│   ├── profiles/
│   │   └── index.ts           # OS profiles
│   ├── components/
│   │   ├── layout/            # Header
│   │   ├── vm/                # Viewport, Toolbar, QuickKeysDeck
│   │   └── modals/            # Snapshots, Network, Paste, Logs, Mount Media
│   ├── App.tsx
│   └── index.css              # Tailwind CSS + CRT scanline styles
├── scripts/                   # Runtime sync, quality hooks, browser test runners
├── docs/
│   └── DEPLOYMENT.md          # Deployment plan
└── .github/workflows/
    └── deploy.yml             # Automated GitHub Pages CI/CD
```

---

## 📄 License

MIT — see [LICENSE](LICENSE).

This project bundles the [v86](https://github.com/copy/v86) emulator (BSD-2-Clause), BIOS firmware, and a Linux kernel image, each under its own license. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
