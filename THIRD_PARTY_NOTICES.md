# Third-Party Notices

RetroMuseum's own code is MIT-licensed (see [LICENSE](LICENSE)). The site redistributes the following, each under its own license.

## v86

The emulator code bundled into the site and `v86.wasm`, both from the npm `v86` package, version 0.5.460.

- Project: https://github.com/copy/v86
- License: BSD-2-Clause (below). The v86 build also contains Berkeley SoftFloat, zstd decompression, and floppy code ported from QEMU, each under its own license; see the v86 repository.

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

`public/bios/seabios.bin` and `public/bios/vgabios.bin`.

- Project: https://www.seabios.org/ (version `rel-1.16.2`)
- License: GNU Lesser General Public License v3
- Source: https://review.coreboot.org/seabios.git, tag `rel-1.16.2`

## Operating systems hosted on this site

These disk images are not stored in this repository. `npm run images` downloads each one from the address below and checks its SHA-256 (recorded in the exhibit's file under `src/content/exhibits/`), and the deploy publishes it in the site's `images/` folder. Each operating system remains under its own license.

| Exhibit | Image | Downloaded from | License | Source code |
| --- | --- | --- | --- | --- |
| TetrOS | `tetros.img` | https://raw.githubusercontent.com/daniel-e/tetros/f0ebf20cd7bf81c8f7bbd3500892257057b0cee4/tetros.img | MIT | https://github.com/daniel-e/tetros |
| SectorLISP | `sectorlisp-friendly.bin` | https://i.copy.sh/sectorlisp-friendly.bin | ISC | https://github.com/jart/sectorlisp/tree/friendly |
| Floppy Bird | `floppybird.img` | https://raw.githubusercontent.com/icebreaker/floppybird/5c8f3d1fd6e5d8243240d49428bfad36ba95b909/build/iso/floppybird.img | MIT | https://github.com/icebreaker/floppybird |
| BootChess | `bootchess.img` | https://i.copy.sh/bootchess.img | WTFPL | https://www.pouet.net/prod.php?which=64962 (the download archive includes the source) |
| FreeDOS | `freedos722.img` | https://i.copy.sh/freedos722.img | GPL-2.0 (kernel and FreeCOM) and the licenses of its other programs | https://www.ibiblio.org/pub/micro/pc-stuff/freedos/files/ |
| KolibriOS | `kolibri.img` | https://i.copy.sh/kolibri.img (automatic build r9913, 13 April 2023) | GPL-2.0 | https://git.kolibrios.org/KolibriOS/kolibrios |
| HelenOS | `HelenOS-0.14.1-ia32.iso` | https://www.helenos.org/releases/HelenOS-0.14.1-ia32.iso | BSD, with some GPL components | https://www.helenos.org/releases/HelenOS-0.14.1-src.tar.bz2 |
| ELKS | `elks-0.9.2-hd32-fat.img` | https://github.com/ghaerr/elks/releases/download/v0.9.2/hd32-fat.img | GPL-2.0 | https://github.com/ghaerr/elks/tree/v0.9.2 |

If you hold rights to one of these and want it removed, open a [removal request](https://github.com/hammadshakeelai/RetroMuseum/issues/new?template=removal-request.yml).

## Operating systems on copy.sh

The other exhibits open on https://copy.sh/v86/, the v86 project's own site, which hosts their disk images. RetroMuseum doesn't host or offer those images. The Windows, MS-DOS, 86-DOS, and BeOS exhibits are copyrighted software, shown for their history.
