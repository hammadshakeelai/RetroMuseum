---
title: BootChess
maker: Olivier "Baudsurfer" Poudade, Red Sector Inc.
year: 2015
family: boot-sector
license: open-source
summary: A chess program in a 512-byte boot sector. You play black against the computer and type each move as two squares.
screenshotWaitSeconds: 30
facts:
  Size here: "512 bytes"
  Smallest version: "487 bytes"
  Released: January 2015
  Written in: x86 assembly, built with FASM
tryThis:
  - The computer opens with e2e4. Answer by typing e7e5
  - Move a knight by typing g8f6
  - Press Esc to start a new game
homepage: https://www.pouet.net/prod.php?which=64962
sources:
  - https://www.pouet.net/prod.php?which=64962
  - https://www.pouet.net/prod_nfo.php?which=64962
diskImage:
  from: https://i.copy.sh/bootchess.img
  sha256: 04cd453801433b51e8684814977b30dfc0367315706ce792438601eaf1da88a1
  license: WTFPL
  source: https://www.pouet.net/prod.php?which=64962
v86:
  fda:
    url: bootchess.img
    size: 1474560
downloadEstimateMB: 2
screenshot: ./screenshots/bootchess.png
---

BootChess is a chess program that fits in a PC boot sector. Olivier "Baudsurfer" Poudade of the demo group Red Sector Inc. released it in January 2015, with help from Peter "QKumba" Ferrie.

Its release notes call it the smallest computer implementation of chess on any platform, beating the 1024 bytes of 1K ZX Chess, a record that had stood for 33 years. The smallest version is 487 bytes. The bootable version shown here uses all 512 bytes and can promote pawns to queens.

The computer plays white and always opens with e2e4. You play black by typing a move as four characters: the square a piece starts on, then the square it moves to. The board is drawn as text, with white pieces in capitals and black pieces in lower case. The source code was published under the WTFPL.
