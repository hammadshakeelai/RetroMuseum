---
title: KolibriOS
maker: The KolibriOS team
year: 2023
family: independent
license: open-source
summary: A graphical operating system written entirely in assembly language that fits on a single 1.44 MB floppy disk.
screenshotWaitSeconds: 60
facts:
  Build shown: automatic build r9913, 13 April 2023
  Written in: FASM assembly
  Boot media: 1.44 MB floppy
  Forked from: MenuetOS, 2004
tryThis:
  - Open Menu at the bottom left and start a program from it
  - Double-click TETRIS or SNAKE on the desktop to play
  - Open Documentation in Menu to browse the manuals that come with the system
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
downloadEstimateMB: 2
screenshot: ./screenshots/kolibrios.png
---

KolibriOS is an open-source operating system for x86 PCs, written entirely in assembly language with the flat assembler FASM. Most of its distributions fit on a single 1.44 MB floppy disk image. Even so, it has a graphical interface, preemptive multitasking, networking, and bundled programs such as a word processor, an image viewer, a music player and a web browser.

It began in 2004 as a fork of MenuetOS. Its first version, released by Marat Zakiyanov, was meant as a driver fix for MenuetOS's Russian-language distribution. When MenuetOS's developer later chose to focus on a closed-source 64-bit version, KolibriOS carried on as an open-source 32-bit system. Contributors have come from Russia, Kazakhstan, Ukraine, Belarus, Germany, Belgium and other countries.

Kolibri is the Slavic spelling of the word for hummingbird, a nod to the system's small size and speed. Its developers say it needs an i586 processor and 12 MB of RAM. The disk image here is the project's automatic build r9913 from April 2023.
