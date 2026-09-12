import { assetUrl } from "../emulator/runtime";
import type { VMProfile } from "../emulator/types";

export const PROFILES: VMProfile[] = [
  {
    id: "micro-sandbox",
    name: "Micro Linux 6.8 (Bundled Sandbox)",
    category: "micro",
    mode: "cli",
    description:
      "Ultra-lightweight Linux 6.8 kernel with BusyBox, Lua, curl, ping, and core POSIX utilities. Bundled locally in public/images/ for zero-latency instant offline boot.",
    tagline: "Local 5MB Kernel • Instant Boot • Zero Network Dependency",
    memorySize: 128 * 1024 * 1024,
    vgaMemorySize: 4 * 1024 * 1024,
    filesystem: {},
    sharedDirectory: "/mnt",
    bzimageUrl: assetUrl("images/buildroot-bzimage.bin"),
    cmdline: "tsc=reliable mitigations=off random.trust_cpu=on console=ttyS0 console=tty0",
    netDevice: "virtio",
    recommended: true,
  },
  {
    id: "arch-cli",
    name: "Arch Linux 32 (Terminal)",
    category: "arch",
    mode: "cli",
    description:
      "Complete 32-bit Arch Linux environment featuring bash, zsh, vim, git, python, gcc, and iproute2. Boots in ~2 seconds using memory state resumption and on-demand 9P VirtIO filesystem from CDN.",
    tagline: "Instant State Resume • 9P VirtIO Filesystem • Rolling Release",
    memorySize: 512 * 1024 * 1024,
    vgaMemorySize: 8 * 1024 * 1024,
    stateUrl: "https://i.copy.sh/arch_state-v3.bin.zst",
    filesystem: {
      baseurl: "https://i.copy.sh/arch/",
    },
    netDevice: "virtio",
    recommended: true,
  },
  {
    id: "arch-gui",
    name: "Arch Linux 32 (Desktop)",
    category: "arch",
    mode: "gui",
    description:
      "Arch Linux 32 graphical environment with Xorg, lightweight window manager, NetSurf browser, and X11 accessories.",
    tagline: "Xorg Graphical Desktop • LightDM • Fast On-Demand Streaming",
    memorySize: 1024 * 1024 * 1024,
    vgaMemorySize: 32 * 1024 * 1024,
    stateUrl: "https://i.copy.sh/arch_state-v3.bin.zst",
    filesystem: {
      baseurl: "https://i.copy.sh/arch/",
    },
    netDevice: "virtio",
  },
  {
    id: "dsl-gui",
    name: "Damn Small Linux 4.11 (Live GUI)",
    category: "dsl",
    mode: "gui",
    description:
      "Lightweight live graphical Linux desktop featuring Firefox, Fluxbox window manager, text editors, PDF viewers, and terminal tools in a 50MB live CD image.",
    tagline: "Live GUI Desktop • Firefox 2.0 • Fluxbox WM • Out-of-the-Box",
    memorySize: 256 * 1024 * 1024,
    vgaMemorySize: 8 * 1024 * 1024,
    cdromUrl: "https://i.copy.sh/dsl-4.11.rc2.iso",
    netDevice: "ne2k",
    recommended: true,
  },
  {
    id: "kolibri-gui",
    name: "KolibriOS (Floppy GUI)",
    category: "kolibri",
    mode: "gui",
    description:
      "Tiny, blazing-fast 32-bit operating system written completely in x86 assembly. Features rich graphical desktop, games, file manager, text editors, and demo apps in a 1.44MB floppy image.",
    tagline: "Sub-Second Boot • Written in ASM • 1.4MB Floppy • Built-in Apps",
    memorySize: 64 * 1024 * 1024,
    vgaMemorySize: 4 * 1024 * 1024,
    fdaUrl: "https://i.copy.sh/kolibri.img",
    recommended: true,
  },
  {
    id: "freedos-cli",
    name: "FreeDOS 1.3 (Floppy CLI)",
    category: "freedos",
    mode: "cli",
    description:
      "Complete, open-source DOS-compatible operating system. Classic MS-DOS/PC-DOS command line environment, batch scripts, and retro utility execution.",
    tagline: "Classic DOS CLI • 720KB Floppy • Instant Boot • Open Source",
    memorySize: 32 * 1024 * 1024,
    vgaMemorySize: 2 * 1024 * 1024,
    fdaUrl: "https://i.copy.sh/freedos722.img",
    recommended: true,
  },
  {
    id: "linux4-cli",
    name: "Linux 4.x Minimal Live CD",
    category: "micro",
    mode: "cli",
    description:
      "Compact 7.3MB live CD running the Linux 4.x kernel with Busybox shell and networking utilities.",
    tagline: "Minimal 7MB Live ISO • Quick CLI Diagnostics",
    memorySize: 128 * 1024 * 1024,
    vgaMemorySize: 4 * 1024 * 1024,
    cdromUrl: "https://i.copy.sh/linux4.iso",
    netDevice: "virtio",
  },
  {
    id: "arch-boot",
    name: "Arch Linux 32 (Cold Boot 9P)",
    category: "arch",
    mode: "cli",
    description:
      "Cold-boots Arch Linux 32 directly from BIOS through the Linux kernel and OpenRC init sequence using root-on-9P streaming. (Note: For sub-second interactive shell, choose Arch Linux 32 Terminal with instant state resume).",
    tagline: "Kernel Boot Sequence • OpenRC Init • Raw System Log",
    memorySize: 512 * 1024 * 1024,
    vgaMemorySize: 8 * 1024 * 1024,
    filesystem: {
      baseurl: "https://i.copy.sh/arch/",
      basefsUrl: "https://i.copy.sh/fs.json",
    },
    cmdline:
      "rw apm=off vga=0x344 video=vesafb:ypan,vremap:8 root=host9p rootfstype=9p rootflags=trans=virtio,cache=loose mitigations=off audit=0 init_on_free=on tsc=reliable random.trust_cpu=on nowatchdog init=/usr/bin/init-openrc net.ifnames=0 biosdevname=0",
    netDevice: "virtio",
  },
  {
    id: "kali-cli",
    name: "Kali Linux 2024.3 i386 (Pen-Test Shell)",
    category: "kali",
    mode: "cli",
    description:
      "Kali Linux 2024.3 - the historic final release providing official i386 images. Requires a hosted ISO or custom image URL (see scripts/build-kali-32.md).",
    tagline: "Offensive Security • Final 32-bit Release • Mount Custom ISO",
    memorySize: 768 * 1024 * 1024,
    vgaMemorySize: 16 * 1024 * 1024,
    netDevice: "virtio",
    needsCustomMedia: true,
  },
  {
    id: "kali-gui",
    name: "Kali Linux 2024.3 (XFCE Desktop)",
    category: "kali",
    mode: "gui",
    description:
      "Kali Linux graphical desktop featuring signature Kali theme and security toolkit. Requires custom mounted ISO or hosted snapshot.",
    tagline: "Kali Desktop • XFCE • Requires Custom ISO / CDN Snapshot",
    memorySize: 1024 * 1024 * 1024,
    vgaMemorySize: 32 * 1024 * 1024,
    netDevice: "virtio",
    needsCustomMedia: true,
  },
  {
    id: "ubuntu-cli",
    name: "Ubuntu 18.04 i386 (CLI)",
    category: "ubuntu",
    mode: "cli",
    description:
      "Ubuntu 18.04 LTS (Bionic Beaver) 32-bit core. Requires hosted ISO or custom image URL.",
    tagline: "Debian/Ubuntu 32-bit Core • Requires Custom ISO / CDN",
    memorySize: 512 * 1024 * 1024,
    vgaMemorySize: 8 * 1024 * 1024,
    netDevice: "ne2k",
    needsCustomMedia: true,
  },
  {
    id: "ubuntu-gui",
    name: "Xubuntu 18.04 i386 (XFCE)",
    category: "ubuntu",
    mode: "gui",
    description:
      "Lightweight XFCE desktop built on Ubuntu 18.04 i386. Requires hosted ISO or custom image URL.",
    tagline: "XFCE 4.12 Desktop • Requires Custom ISO / CDN",
    memorySize: 768 * 1024 * 1024,
    vgaMemorySize: 32 * 1024 * 1024,
    netDevice: "ne2k",
    needsCustomMedia: true,
  },
  {
    id: "blackarch-exp",
    name: "BlackArch Linux (Experimental)",
    category: "blackarch",
    mode: "cli",
    description:
      "Arch Linux 32 base customized with BlackArch penetration testing toolkit compiled for i686 architecture.",
    tagline: "Arch 32 Security Toolchain • Requires Custom Image",
    memorySize: 768 * 1024 * 1024,
    vgaMemorySize: 16 * 1024 * 1024,
    isExperimental: true,
    netDevice: "virtio",
    needsCustomMedia: true,
  },
];

export function getProfileById(id: string): VMProfile {
  return PROFILES.find((p) => p.id === id) || PROFILES[0];
}
