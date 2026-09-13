---
title: SectorLISP
maker: Justine Tunney
year: 2021
family: boot-sector
license: open-source
summary: A LISP in a 512-byte boot sector that can run John McCarthy's meta-circular evaluator with no operating system.
screenshotWaitSeconds: 30
screenshotInput: "(CONS (QUOTE X) (QUOTE Y))\n(ATOM NIL)\n(EQ (QUOTE A) (QUOTE A))\n"
facts:
  Size: "512 bytes"
  Written in: i8086 assembly
  This build: the friendly branch, November 2021
tryThis:
  - "Build a pair: (CONS (QUOTE X) (QUOTE Y))"
  - "Ask whether NIL is an atom: (ATOM NIL)"
  - "Compare two symbols: (EQ (QUOTE A) (QUOTE A))"
homepage: https://github.com/jart/sectorlisp
sources:
  - https://github.com/jart/sectorlisp
  - https://github.com/jart/sectorlisp/blob/friendly/lisp.lisp
diskImage:
  from: https://i.copy.sh/sectorlisp-friendly.bin
  sha256: 2b71dffae9900f3aa280ad6eb3bb2752dffb589a8d9a5463515683d03e7021d8
  license: ISC
  source: https://github.com/jart/sectorlisp/tree/friendly
v86:
  fda:
    url: sectorlisp-friendly.bin
    size: 512
downloadEstimateMB: 1
screenshot: ./screenshots/sectorlisp.png
---

SectorLISP is an implementation of LISP that fits in 512 bytes, the size of the boot sector a PC's BIOS loads when it starts. Its authors describe it as the tiniest true LISP implementation they know of.

It is built around John McCarthy's meta-circular evaluator from his 1960 paper on LISP: an interpreter for LISP written in LISP itself. The project's repository includes that evaluator as one expression, with its bugs fixed and its syntactic sugar removed. It needs only eight primitives: CONS, CAR, CDR, QUOTE, ATOM, EQ, LAMBDA and COND. The boot sector is small enough to run it on bare metal.

The repository also has a portable C version. This exhibit runs its "friendly" branch, which Justine Tunney started in November 2021 to make the interpreter easier to use, with contributions from Peter Ferrie and others.

There is no prompt. Type an expression, press Enter, and SectorLISP prints the result.
