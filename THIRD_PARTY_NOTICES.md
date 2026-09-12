# Third-Party Notices

This project's own code is MIT-licensed (see [LICENSE](LICENSE)). The components below are redistributed in this repository and on the deployed site, each under its own license.

## v86

Files: `public/v86/libv86.js`, `public/v86/v86.wasm`, `public/v86/v86-fallback.wasm`

- Project: https://github.com/copy/v86
- License: BSD-2-Clause (full text below)
- The v86 build also contains Berkeley SoftFloat, zstd decompression, and floppy code ported from QEMU (MIT), each under its own license. See the v86 repository for details.

```
Copyright (c) 2012, The v86 contributors
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## SeaBIOS and SeaVGABIOS

Files: `public/bios/seabios.bin`, `public/bios/vgabios.bin`

- Project: https://www.seabios.org/ (version `rel-1.16.2`)
- License: GNU Lesser General Public License v3
- Source: https://review.coreboot.org/seabios.git, tag `rel-1.16.2`

## Linux kernel image

File: `public/images/buildroot-bzimage.bin`

- Linux 5.6.15 kernel with a Buildroot (BusyBox) userspace, built by the v86 project in 2020
- Licenses: the Linux kernel and BusyBox are under GPL-2.0; other Buildroot packages are under their own licenses
- Upstream source: Linux 5.6.15 at https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-5.6.15.tar.xz, Buildroot at https://buildroot.org, and BusyBox at https://busybox.net
- The exact build configuration for this image has not been published. Replacing it with an image built from a published configuration is tracked in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Operating system images loaded at runtime

The Arch Linux, Damn Small Linux, Linux 4.x, KolibriOS, and FreeDOS images are **not** in this repository. The browser downloads them from `https://i.copy.sh/`, and they remain under their respective licenses.
