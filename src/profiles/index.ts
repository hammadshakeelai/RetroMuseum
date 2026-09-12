import type { VMProfile } from "../emulator/types";

export const PROFILES: VMProfile[] = [
  {
    id: "micro-sandbox",
    name: "Micro Linux 6.8 (Bundled Sandbox)",
    category: "micro",
    mode: "cli",
    description:
      "Ultra-lightweight Linux 6.8 kernel with BusyBox, Lua, curl, ping, and core POSIX utilities. Bundled locally for zero-latency instant offline boot.",
    tagline: "Local 5MB Kernel • Instant Boot • Zero Network Dependency",
    memorySize: 128 * 1024 * 1024,
    vgaMemorySize: 4 * 1024 * 1024,
    bzimageUrl: "/images/buildroot-bzimage.bin",
    cmdline: "tsc=reliable mitigations=off random.trust_cpu=on quiet",
    netDevice: "virtio",
    recommended: true,
  },
  {
    id: "arch-cli",
    name: "Arch Linux 32 (Terminal)",
    category: "arch",
    mode: "cli",
    description:
      "Complete 32-bit Arch Linux environment featuring bash, zsh, vim, git, python, gcc, and iproute2. Boots in ~2 seconds using memory state resumption and on-demand 9P VirtIO filesystem.",
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
    id: "arch-boot",
    name: "Arch Linux 32 (Cold Boot 9P)",
    category: "arch",
    mode: "cli",
    description:
      "Cold-boots Arch Linux 32 directly from BIOS through the Linux kernel and OpenRC init sequence using root-on-9P streaming.",
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
    id: "ubuntu-cli",
    name: "Ubuntu 18.04 i386 (CLI)",
    category: "ubuntu",
    mode: "cli",
    description:
      "Ubuntu 18.04 LTS (Bionic Beaver) - the final LTS generation supporting bootable 32-bit x86 installations with apt and Debian tooling.",
    tagline: "Debian/Ubuntu 32-bit Core • apt package manager • Classic CLI",
    memorySize: 512 * 1024 * 1024,
    vgaMemorySize: 8 * 1024 * 1024,
    netDevice: "ne2k",
  },
  {
    id: "ubuntu-gui",
    name: "Xubuntu 18.04 i386 (XFCE)",
    category: "ubuntu",
    mode: "gui",
    description:
      "Lightweight XFCE desktop environment built on Ubuntu 18.04 i386 with lower RAM overhead than GNOME.",
    tagline: "XFCE 4.12 Desktop • Low RAM Footprint • Traditional Windowing",
    memorySize: 768 * 1024 * 1024,
    vgaMemorySize: 32 * 1024 * 1024,
    netDevice: "ne2k",
  },
  {
    id: "kali-cli",
    name: "Kali Linux 2024.3 i386 (Pen-Test Shell)",
    category: "kali",
    mode: "cli",
    description:
      "Kali Linux 2024.3 - the historic final release providing official i386 images. Optimized for command-line security testing, network mapping, and CTF challenges.",
    tagline: "Offensive Security • Final Official 32-bit Kernel • CTF Ready",
    memorySize: 768 * 1024 * 1024,
    vgaMemorySize: 16 * 1024 * 1024,
    netDevice: "virtio",
  },
  {
    id: "kali-gui",
    name: "Kali Linux 2024.3 (XFCE Desktop)",
    category: "kali",
    mode: "gui",
    description:
      "Kali Linux graphical desktop featuring the signature Kali theme, terminal multiplexer, and curated security tools.",
    tagline: "Kali Desktop • Signature Dark Theme • Forensics & Recon Tools",
    memorySize: 1024 * 1024 * 1024,
    vgaMemorySize: 32 * 1024 * 1024,
    netDevice: "virtio",
  },
  {
    id: "blackarch-exp",
    name: "BlackArch Linux (Experimental)",
    category: "blackarch",
    mode: "cli",
    description:
      "Arch Linux 32 base customized with BlackArch penetration testing toolkit and security toolchain compiled for i686 architecture.",
    tagline: "Arch 32 Security Toolchain • Advanced Exploit Research",
    memorySize: 768 * 1024 * 1024,
    vgaMemorySize: 16 * 1024 * 1024,
    isExperimental: true,
    netDevice: "virtio",
  },
];

export function getProfileById(id: string): VMProfile {
  return PROFILES.find((p) => p.id === id) || PROFILES[0];
}
