---
title: OpenBSD
maker: Theo de Raadt and the OpenBSD project
year: 2019
family: unix-bsd-linux
license: open-source
summary: The security-focused BSD that Theo de Raadt forked from NetBSD in 1995, the home of OpenSSH, shown as OpenBSD 6.6 from 2019.
screenshotWaitSeconds: 120
facts:
  Founded: October 1995, forked from NetBSD 1.0
  Version here: "6.6"
  Releases: every six months
  Known for: OpenSSH and the PF firewall
tryThis:
  - Type uname -a to see the version
  - Type mail to read the "Welcome to OpenBSD 6.6!" letter, then q to quit
homepage: https://www.openbsd.org/
sources:
  - https://en.wikipedia.org/wiki/OpenBSD
  - https://www.openbsd.org/
copyShProfile: openbsd
downloadEstimateMB: 11
screenshot: ./screenshots/openbsd.png
---

OpenBSD is a free, security-focused Unix-like operating system based on the Berkeley Software Distribution (BSD). Theo de Raadt, a founding member of NetBSD, was asked to resign from NetBSD's core team in December 1994. In October 1995 he founded OpenBSD by forking NetBSD 1.0. The first release, OpenBSD 1.2, came in July 1996, and the project has released a new version every six months since.

The project emphasizes portability, standardization, correctness, proactive security and integrated cryptography. Its website says the default install has had "only two remote holes" in a very long time.

Its permissive BSD license lets its code travel. OpenSSH comes from OpenBSD, the firewall in Apple's macOS is based on OpenBSD's PF, Android's C library is based on OpenBSD code, and Windows 10 uses OpenSSH with LibreSSL. By 2024, every file from the original NetBSD fork had been changed or removed.

This exhibit resumes from a state saved on copy.sh, already logged in as root on OpenBSD 6.6, whose kernel was built on 12 October 2019.
