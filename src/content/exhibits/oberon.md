---
title: Oberon
maker: Niklaus Wirth, Jürg Gutknecht and ETH Zurich
year: 2003
family: independent
license: open-source
summary: The ETH Zurich operating system written in the Oberon language, where text anywhere on screen can be clicked to run as a command.
screenshotWaitSeconds: 60
facts:
  Designed by: Niklaus Wirth and Jürg Gutknecht
  Written in: Oberon
  Version here: PC Native Oberon, 5 January 2003
  Commands: text you click with the middle mouse button
tryThis:
  - Middle-click Script.Open System.Text, or double-click it with the left button, for an introduction
  - Middle-click System.Directory to list the files
  - Press Shift to set up the mouse, as the System.Log asks
sources:
  - https://en.wikipedia.org/wiki/Oberon_(operating_system)
diskImage:
  from: https://i.copy.sh/oberon.img
  sha256: ebd5825d013c1c342c8f48b49d5a33f3ef477f1777c362bc0e5d91b75ffd1196
  license: ETH Oberon license (BSD-style)
v86:
  hda:
    url: oberon.img
    size: 25165824
    async: false
downloadEstimateMB: 24
screenshot: ./screenshots/oberon.png
---

The Oberon System is a modular, single-user operating system written in the Oberon programming language. Niklaus Wirth and Jürg Gutknecht designed and implemented it at ETH Zurich in the late 1980s, as part of the Ceres workstation project, and documented it fully in their book Project Oberon.

Its text user interface is neither a command line nor a conventional graphical interface. Text almost anywhere on the screen can be edited and used as a command: a middle-click on a word of the form Module.Command runs that command. The design influenced the Acme text editor of Plan 9 from Bell Labs.

A team at ETH Zurich later extended Oberon and ported it to other hardware. Native Oberon runs on bare hardware, and its basic system fits on one high-density floppy disk. This exhibit runs PC Native Oberon dated 5 January 2003, the latest Native Oberon before its successors became AOS, Bluebottle and A2. In 2013, a few months before his 80th birthday, Wirth published a new edition of Project Oberon for a RISC processor of his own design.
