---
title: Unix V7
maker: Bell Labs, ported to the PC by Robert Nordier
year: 1979
family: unix-bsd-linux
license: open-source
summary: The 1979 Seventh Edition of Unix, the last Research Unix from Bell Labs to be widely distributed, in Robert Nordier's port to the PC.
screenshotWaitSeconds: 120
screenshotInput: "\n"
facts:
  Released: "1979"
  From: Bell Labs Research Unix
  Port shown: V7/x86 0.8a
  System calls: about 50
tryThis:
  - Press Enter at the BOOT prompt to start the kernel
  - List the root directory in the long format with ls -l /
  - Start the C shell with csh, or edit a file with ed
sources:
  - https://en.wikipedia.org/wiki/Version_7_Unix
  - https://www.nordier.com/
  - https://github.com/copy/v86/blob/master/src/browser/main.js
copyShProfile: unix-v7
downloadEstimateMB: 1
screenshot: ./screenshots/unix-v7.png
---

Version 7 Unix, also called the Seventh Edition, was released by Bell Laboratories in 1979. It was the last Bell Labs release to be widely distributed before AT&T commercialized Unix in the early 1980s. For its power and simplicity, many longtime Unix users remember it as "the last true Unix".

V7 was the first readily portable version of Unix. It was written for Digital Equipment Corporation's PDP-11 minicomputers and soon ported to other machines. The first Sun workstations ran a V7 port, the first Microsoft Xenix for the Intel 8086 was derived from it, and its VAX port, UNIX/32V, was the direct ancestor of UNIX System V and the 4BSD family. V7 introduced the Bourne shell, awk, make, lex, lint, tar and environment variables, and it had only about 50 system calls.

In 2002 Caldera International released V7 under a permissive BSD-like license. Robert Nordier had begun porting it to the x86 PC in 1999, when "Ancient UNIX" source licenses first became available, and revised the port in 2006 and 2007. His V7/x86 supports IDE hard disks, CD-ROM drives, floppy drives and serial ports, and adds early Berkeley software: the C shell, the editors ex and vi, and the pager more. Nordier describes it as beta software rather than a polished release.

This exhibit's disk is a smaller installation of V7/x86 0.8a. After you press Enter at its BOOT prompt, it starts straight into a root shell with no login, and it has the C shell and ed but not vi.
