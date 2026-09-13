---
title: TetrOS
maker: Daniel Etzold
year: 2016
family: boot-sector
license: open-source
summary: A Tetris clone in x86 assembly that fits in a 512-byte boot sector and runs with no operating system at all.
screenshotWaitSeconds: 30
facts:
  Code size: "446 bytes"
  Boot media: "512-byte boot sector"
  Written in: x86 assembly, built with NASM
  First release: October 2016
tryThis:
  - Move a brick with the left and right arrow keys
  - Rotate a brick with the up arrow key
  - Drop a brick with the down arrow key
  - Stack bricks to the top so the game stops, then press Ctrl+Alt+Del to start a new one
homepage: https://github.com/daniel-e/tetros
sources:
  - https://github.com/daniel-e/tetros
  - https://etzold.dev
diskImage:
  from: https://raw.githubusercontent.com/daniel-e/tetros/f0ebf20cd7bf81c8f7bbd3500892257057b0cee4/tetros.img
  sha256: fb9c23e1ffbe25ee35e2dd5a4f60c7e79710d0319ffa83da89fe0dd8a79f293c
  license: MIT
  source: https://github.com/daniel-e/tetros
v86:
  fda:
    url: tetros.img
    size: 512
downloadEstimateMB: 1
screenshot: ./screenshots/tetros.png
---

TetrOS is a small Tetris clone written in assembly language. Its code is 446 bytes long: the most a drive's master boot record allows for the first stage of a boot loader. That makes the whole game fit inside a disk's 512-byte boot sector.

The PC runs it while starting up, at the point where an operating system would normally begin to load. TetrOS doesn't need one. Its author points out that this makes TetrOS an operating system itself, which is where the "OS" in its name comes from.

Fitting in so little space meant leaving things out. There are no scores, no intro, no game-over message, no preview of the next brick, and the game never speeds up. To play again, you restart the machine. What remains still has care in it: every brick shape has its own colour, the cursor is hidden, and the next brick is picked at random by a linear congruential generator.
