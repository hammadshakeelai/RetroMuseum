---
title: Floppy Bird
maker: Mihail Szabolcs
year: 2014
family: boot-sector
license: open-source
summary: A Flappy Bird clone in 16-bit x86 assembly that boots from a floppy disk with no operating system underneath.
screenshotWaitSeconds: 30
facts:
  Written in: 16-bit x86 assembly, built with NASM
  Boot media: 1.44 MB floppy
  Also builds as: a DOS .COM program
tryThis:
  - Press any key to start, then tap a key to flap between the pipes
  - On the title screen, press Backspace for a different background or Tab for a different bird
homepage: http://mihail.co/floppybird
sources:
  - https://github.com/icebreaker/floppybird
  - http://mihail.co/floppybird
diskImage:
  from: https://raw.githubusercontent.com/icebreaker/floppybird/5c8f3d1fd6e5d8243240d49428bfad36ba95b909/build/iso/floppybird.img
  sha256: 5db1b469e25e9eda7b8c0f666d6b655bab083c85618a9453ee72f1201cca840f
  license: MIT
  source: https://github.com/icebreaker/floppybird
v86:
  fda:
    url: floppybird.img
    size: 1474560
downloadEstimateMB: 2
screenshot: ./screenshots/floppybird.png
---

Floppy Bird is a clone of the mobile game Flappy Bird, written in 16-bit x86 assembly by Mihail Szabolcs in 2014.

It doesn't need an operating system. The PC's BIOS loads it from the disk and the game takes over the machine, which its README describes as making Floppy Bird an operating system of its own.

The same source builds three ways: a floppy image, a CD-ROM image that emulates a floppy, and a .COM program for DOS-like environments such as DOSBox. The graphics are stored as small 256-colour TGA images, which the README suggests editing in GIMP.
