---
title: HelenOS
maker: The HelenOS project
year: 2024
family: independent
license: open-source
summary: A research operating system on a microkernel, where drivers, file systems and the graphical interface run as separate servers.
screenshotWaitSeconds: 120
facts:
  Version: '0.14.1 "Aladar"'
  Released: 19 May 2024
  Design: multiserver microkernel
  Written in: C
tryThis:
  - Type help in the terminal for a few survival tips
  - Open the Start menu on the taskbar and start another program
  - Minimize the Terminal window, then bring it back from the taskbar
homepage: http://www.helenos.org/
sources:
  - https://en.wikipedia.org/wiki/HelenOS
  - http://www.helenos.org/
  - https://www.helenos.org/wiki/ReleaseNotes/0.14.1
diskImage:
  from: https://www.helenos.org/releases/HelenOS-0.14.1-ia32.iso
  sha256: 1b15da0459cbfe28a6d3058675c2c20a4b03584cfb4d034c0ccb17b521791ccb
  license: BSD, with some GPL components
  source: https://www.helenos.org/releases/HelenOS-0.14.1-src.tar.bz2
v86:
  memory_size: 268435456
  cdrom:
    url: HelenOS-0.14.1-ia32.iso
    size: 25792512
    async: false
downloadEstimateMB: 25
screenshot: ./screenshots/helenos.png
---

HelenOS is an operating system built on a multiserver microkernel. The kernel handles only multitasking, memory management and communication between processes. File systems, networking, device drivers and the graphical interface run as separate programs in user space, and they work together by passing messages.

Its developers describe the result as modular and fault tolerant: when one component crashes, it doesn't directly harm the others. HelenOS doesn't try to clone an existing system, and it gives up compatibility with older programming interfaces for a cleaner design.

Development is community-driven. The core team is mostly staff and former and current students of the Faculty of Mathematics and Physics at Charles University in Prague. HelenOS runs on many processor architectures, from x86 and ARM to SPARC and RISC-V. Its code is published under the BSD license, with some third-party parts under the GPL.

This exhibit is release 0.14.1, named Aladar, from May 2024. It added a Start menu to the taskbar, windows that can be minimized, and a system menu for managing windows from the keyboard.
