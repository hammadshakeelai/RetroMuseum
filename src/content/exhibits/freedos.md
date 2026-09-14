---
title: FreeDOS
maker: The FreeDOS Project
year: 2012
family: dos
license: open-source
summary: A free MS-DOS-compatible operating system, started in 1994, shown here as a small boot floppy with a 2012 kernel.
screenshotWaitSeconds: 60
facts:
  Project started: 29 June 1994
  First stable release: FreeDOS 1.0, 2006
  Kernel here: build 2040, compiled April 2012
  Command shell here: FreeCOM 0.82 pl 3, December 2003
tryThis:
  - Type ver /r to see the kernel and shell versions
  - List the floppy's files with dir
  - Type invaders to play Space Invaders, one of the games the welcome message suggests
homepage: https://www.freedos.org/
sources:
  - https://en.wikipedia.org/wiki/FreeDOS
  - https://www.freedos.org/
diskImage:
  from: https://i.copy.sh/freedos722.img
  sha256: 8ecc7604d4c17c16e136d219a92e64747196d9ae044690e90be9ca0468b1ff12
  license: GPL-2.0 and the licenses of its programs
  source: https://www.ibiblio.org/pub/micro/pc-stuff/freedos/files/
v86:
  fda:
    url: freedos722.img
    size: 737280
downloadEstimateMB: 1
screenshot: ./screenshots/freedos.png
---

FreeDOS is a free operating system compatible with MS-DOS. Jim Hall, then a student, started the project on 29 June 1994, after Microsoft announced it would no longer sell or support MS-DOS. He posted a proposal for a public-domain DOS, at first called PD-DOS.

Within a few weeks other programmers joined him. Pat Villani wrote the kernel, Villani and Tim Norman the COMMAND.COM command interpreter, and Hall the core utilities, pooling code they had written or found. The first stable version, FreeDOS 1.0, came out in 2006.

FreeDOS is licensed under the GNU GPL, with some packages under other licenses. It runs on a PC/XT with 640 KB of memory. Dell and HP have shipped it on computers, and it is a common choice for BIOS update disks. Today the project describes it as a way to play classic DOS games, run legacy business software, and write new DOS programs.

This exhibit boots a 720 KB floppy with FreeDOS kernel build 2040, compiled in April 2012, and the FreeCOM 0.82 command shell from December 2003. Its welcome message suggests three games to try: invaders, snake and tetris.
