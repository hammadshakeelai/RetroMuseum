---
title: Sortix
maker: Jonas 'Sortie' Termansen and contributors
year: 2016
family: independent
license: open-source
summary: A POSIX operating system written from scratch, with its own kernel, C library and base system, shown in its 2016 1.0 release.
screenshotWaitSeconds: 420
facts:
  Released: 28 March 2016
  Development began: 8 February 2011
  Written in: C, with a C++ kernel
  Lines of code: about 169,000
tryThis:
  - List the system's own source code with ls /src
  - Type asteroids to play the game that comes with it
homepage: https://sortix.org/
sources:
  - https://sortix.org/
  - https://sortix.org/release/1.0/
diskImage:
  from: https://pub.sortix.org/sortix/release/1.0/builds/sortix-1.0-i686.iso
  sha256: 03d91cf60e409300f4cb7cbe115f0c86de36841386644a340457fe6ec6a535b7
  license: ISC
  source: https://pub.sortix.org/sortix/release/1.0/source/sortix-1.0.tar.xz
v86:
  memory_size: 536870912
  cdrom:
    url: sortix-1.0-i686.iso
    size: 71075840
    async: false
downloadEstimateMB: 68
screenshot: ./screenshots/sortix.png
---

Sortix is a POSIX operating system written from scratch by Jonas 'Sortie' Termansen and contributors. It has its own kernel, standard library and base system, along with ports of third-party software. Development began around 8 February 2011. It is written in C, with a kernel in C++, and it is free software under the ISC license.

This exhibit runs Sortix 1.0, named "Self-Hosting & Installable" and released on 28 March 2016. It was the first release that could build itself: the system's source code sits in /src as a git repository, with every program needed to rebuild it installed. It also added an interactive installer and upgrader, a partition editor, a login screen, a manual page viewer, rewritten disk drivers and a PS/2 mouse driver. The base system moved from the GPL and LGPL to the ISC license.

Sortix 1.0 had 169,000 lines of source code, up from 8,000 in version 0.3 in May 2011. Since then the project has moved to nightly builds while it works toward version 1.1, and its website runs on a Sortix server.
