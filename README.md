# 🌐 Browser Linux Lab (WebOS)

> A modern, client-side Linux workstation and cyber training lab powered by WebAssembly and the [v86](https://copy.sh/v86/) x86 PC emulator.

Run real Linux environments directly inside your browser—**no backend servers, no Docker containers, no cloud VM costs**.

---

## ✨ Features

- **⚡ Sub-Second Resume Boots**: Pre-saved memory snapshots (`.bin.zst`) resume active Linux sessions into a ready prompt in ~2 seconds.
- **📁 VirtIO 9P On-Demand Filesystem**: Downloads guest files and executables over HTTP only when requested by the OS kernel, saving bandwidth.
- **🛡️ In-Browser Cyber Training Lab (Split-Screen)**: Run two VMs concurrently (e.g. Kali Linux Pen-Test Shell and a Target Linux machine) connected over an isolated browser `BroadcastChannel` virtual switch.
- **💾 IndexedDB State Persistence**: Freeze, save, and restore arbitrary VM memory states directly inside browser storage, or export/import `.bin` snapshot files.
- **⌨️ Smart Keystrokes Deck**: Quick buttons for `Ctrl+C`, `Ctrl+Z`, `Ctrl+Alt+Del`, `Tab`, `Esc`, `Alt+F1..F7` tty console switching.
- **📋 Host-to-Guest Clipboard & Drag-and-Drop**: Drop files onto the screen to inject them into `/root/`, or paste bash scripts directly.
- **📺 Retro CRT Filter & Display Scaling**: Switch between crisp pixel-perfect rendering and scanlines.
- **🚀 100% Static Deployment**: Fully compatible with GitHub Pages, Cloudflare Pages, or Netlify.

---

## 🐧 Distro Support Matrix

| Distribution | Architecture | CLI | GUI (XFCE) | Feasibility | Boot Strategy |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Arch Linux 32** | i686 / 32-bit | ✅ | ✅ | **Excellent** | Snapshot Resume + 9P Streaming |
| **Micro Linux 6.8** | i686 / 32-bit | ✅ | — | **Instant** | Bundled Offline Kernel + BusyBox |
| **Ubuntu 18.04** | i386 / 32-bit | ✅ | ✅ | **Good** | Last Ubuntu generation with 32-bit kernel |
| **Kali Linux 2024.3**| i386 / 32-bit | ✅ | ✅ | **Good** | Final official Kali release with i386 images |
| **BlackArch** | i686 / 32-bit | ⚠️ | ⚠️ | **Experimental** | Custom Arch32 security packages |

> **Note on 64-bit distros**: Modern Ubuntu 24.04+ and current Kali are strictly `x86_64`. v86 emulates 32-bit x86 (Pentium 4 instruction set), so 32-bit releases are used.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
git clone https://github.com/yourusername/WebOS.git
cd WebOS
npm install
```

### 2. Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build
```bash
npm run build
```
Generates optimized static assets in `dist/`.

---

## 🌐 Virtual Networking Modes

1. **In-Browser Mesh (BroadcastChannel)** *(Default)*:
   - Links VMs across tabs or split-screen panes locally.
   - Zero external traffic—packets stay strictly inside the browser.
2. **Offline**:
   - Complete airgap.
3. **WebSocket Relay (wsproxy)**:
   - Relays Ethernet frames through a WebSocket bridge to access the live internet.

---

## 📦 Project Architecture

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
│   │   └── clipboard.ts       # Keystroke scancodes & typing bridge
│   ├── profiles/
│   │   └── index.ts           # Distro profiles (Arch, Ubuntu, Kali, Micro)
│   ├── components/
│   │   ├── layout/            # Header, DualLabLayout
│   │   ├── vm/                # Viewport, Toolbar, QuickKeysDeck
│   │   └── modals/            # Snapshots, Network, Paste, Logs
│   ├── App.tsx
│   └── index.css              # Tailwind CSS + CRT scanline styles
└── .github/workflows/
    └── deploy.yml             # Automated GitHub Pages CI/CD
```

---

## 📄 License

MIT License. Uses the open-source [v86](https://github.com/copy/v86) PC emulator (BSD-2-Clause).
