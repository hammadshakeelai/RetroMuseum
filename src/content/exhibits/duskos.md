---
title: Dusk OS
maker: Virgil Dupras
year: 2023
family: independent
license: open-source
summary: A 32-bit Forth operating system with an "almost C" compiler, meant to stay useful when modern computers can no longer be made.
screenshotWaitSeconds: 60
facts:
  Language: Forth, with an "almost C" compiler
  License: CC0, effectively public domain
  Lines of code: under 6,000 for a booted PC with a C compiler
  Files on this disk: dated 16 December 2023
tryThis:
  - Add two numbers the Forth way by typing 2 3 + .
  - Type words to list every word the system knows
homepage: http://duskos.org/
sources:
  - http://duskos.org/
  - https://git.sr.ht/~vdupras/duskos
diskImage:
  from: https://i.copy.sh/duskos.img
  sha256: 5b0633abf967bdea319a454126da687db3ee7e0ce6636c2e0665d00fe406f51a
  license: CC0-1.0
  source: https://git.sr.ht/~vdupras/duskos
v86:
  hda:
    url: duskos.img
    size: 8388608
    async: false
downloadEstimateMB: 8
screenshot: ./screenshots/duskos.png
---

Dusk OS is a 32-bit Forth operating system and the big brother of Collapse OS. Its stated purpose is to be as useful as possible in the first stage of a civilizational collapse, when modern computers can no longer be produced but many are still around. To get there, it puts simplicity first, even at the cost of unusual constraints.

Its "almost C" compiler lets it reuse C code written for Unix with a modest porting effort. A fully booted PC system on a FAT16 disk, with a C compiler, an assembler and a text editor, takes fewer than 6,000 lines of code. Dusk OS runs on bare metal on i386, amd64, ARM, RISC-V and m68k machines, can rebuild itself on each of them, and has more documentation than code.

It is released under CC0, which effectively places it in the public domain, and its information is also served from a Gopher server that runs on Dusk OS itself. This exhibit boots a disk whose files are all dated 16 December 2023, to the Forth prompt, where each line runs when you press Enter.
