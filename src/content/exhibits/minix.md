---
title: Minix
maker: Andrew S. Tanenbaum and contributors
year: 2014
family: unix-bsd-linux
license: open-source
summary: Andrew Tanenbaum's teaching Unix clone from 1987, shown as MINIX 3.3.0, a microkernel system that can restart crashed drivers.
screenshotWaitSeconds: 300
facts:
  First released: "1987"
  Version here: 3.3.0, September 2014
  Design: microkernel, drivers as separate processes
  License: BSD, since April 2000
tryThis:
  - Log in as root
  - Type uname -a to see the version
  - List the programs in /usr/bin with ls
homepage: https://www.minix3.org/
sources:
  - https://en.wikipedia.org/wiki/Minix
  - https://www.minix3.org/
copyShProfile: minix
downloadEstimateMB: 22
screenshot: ./screenshots/minix.png
---

MINIX is a Unix-like operating system that Andrew S. Tanenbaum wrote at Vrije Universiteit in Amsterdam to accompany his 1987 textbook, Operating Systems: Design and Implementation. Its name comes from "mini-Unix". It was meant for computer science students, it ran on affordable IBM PC and PC/AT computers, and the book printed 12,010 lines of its C source code.

Its license needed a small fee, so when Linux and 386BSD appeared in the early 1990s, many volunteer developers left MINIX for them. Linus Torvalds did early Linux development on a MINIX system, and Linux inherited features such as the MINIX file system, although Tanenbaum disapproved of Linux's monolithic kernel. MINIX became free and open-source under a BSD license in April 2000.

MINIX 3, announced in October 2005, was redesigned as a highly reliable system. Only a tiny microkernel runs in kernel mode, the rest of the system runs as isolated processes, and in many cases a crashed driver restarts without affecting running programs. From version 3.2.0 most of its user programs came from NetBSD.

This exhibit runs MINIX 3.3.0 from September 2014, the release that added ARM support. Development has been dormant since 2018, but MINIX 3 runs inside the Intel Management Engine of Intel chipsets made after 2015.
