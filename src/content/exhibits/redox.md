---
title: Redox
maker: Jeremy Soller and the Redox developers
year: 2024
family: independent
license: open-source
summary: A Unix-like operating system on a microkernel, written in Rust with drivers in user space, shown in a demo build from September 2024.
screenshotWaitSeconds: 180
facts:
  Created by: Jeremy Soller, 2015
  Written in: Rust
  Design: microkernel, with drivers in user space
  Build shown: demo image from 7 September 2024
tryThis:
  - Open the terminal from the dock at the bottom of the screen
  - Open the file manager or the calculator from the same dock
homepage: https://www.redox-os.org/
sources:
  - https://en.wikipedia.org/wiki/Redox_(operating_system)
  - https://www.redox-os.org/
  - https://github.com/copy/v86/blob/master/src/browser/main.js
copyShProfile: redox
downloadEstimateMB: 29
screenshot: ./screenshots/redox.png
---

Redox is a Unix-like operating system based on a microkernel design and written in the Rust programming language. Jeremy Soller created it and first published it on GitHub on 20 April 2015. Its name comes from reduction-oxidation reactions in chemistry, one of which is the corrosion of iron, better known as rust. It is free software, mostly under the MIT license.

Redox aims to be a general-purpose system that is safe and reliable, drawing on seL4, MINIX, Plan 9, BSD and Linux. Its drivers run in user space, its RedoxFS file system is inspired by ZFS, its display and window manager is called Orbital, and its C standard library, relibc, is written in Rust. It is not yet stable.

It comes with graphical programs including the NetSurf web browser, a file manager and a terminal, and since May 2024 it has included several applications from the COSMIC desktop. In 2025 Andrew S. Tanenbaum, the author of MINIX, said Redox has real potential but isn't there yet. This exhibit resumes from a state saved on copy.sh, running a demo image built on 7 September 2024.
