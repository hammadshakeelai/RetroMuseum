---
title: ELKS
maker: The ELKS developers
year: 2026
family: unix-bsd-linux
license: open-source
summary: A small Linux-like system for 16-bit PCs such as the IBM PC XT, begun as a fork of Linux in 1995 and still developed.
screenshotWaitSeconds: 90
facts:
  Version: 0.9.2, 5 September 2026
  Processors: Intel 8086 and later
  Memory: 256 KB to run, 512 KB to be useful
  Began: 1995, as Linux-8086
tryThis:
  - Log in as root, with no password
  - Type tetris to play a text-mode Tetris
  - List the available commands with ls /bin
homepage: https://github.com/ghaerr/elks
sources:
  - https://en.wikipedia.org/wiki/Embeddable_Linux_Kernel_Subset
  - https://github.com/ghaerr/elks
  - https://github.com/ghaerr/elks/releases/tag/v0.9.2
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
downloadEstimateMB: 32
screenshot: ./screenshots/elks.png
---

The Embeddable Linux Kernel Subset, ELKS, is a Linux-like operating system for computers with 16-bit processors, such as the Intel 8086 and 8088, which 32-bit Linux doesn't support. It runs on IBM PC XT and AT class machines and their clones, on newer single-board computers and embedded systems, and on modern x86 PCs.

Linux kernel developers Alan Cox and Chad Page began it in 1995 as Linux-8086, a fork of Linux. It was renamed ELKS in 1996. Development faded in the early 2000s, and in January 2001 Cox called the project "basically dead". Work picked up again in 2012 and has continued since.

ELKS needs no memory management hardware. It runs in 256 KB of RAM, though its developers say 512 KB makes it really useful. Current versions support networking, graphics, and both MINIX and FAT file systems.

This exhibit runs release 0.9.2 from September 2026, which added networking commands such as ping, curl and ifconfig, and automatic network setup with DHCP. RetroMuseum's exhibits have no network connection, so those commands have nothing to reach here.
