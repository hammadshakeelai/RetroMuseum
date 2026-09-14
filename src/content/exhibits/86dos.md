---
title: 86-DOS
maker: Seattle Computer Products
year: 1981
family: dos
license: proprietary
summary: The 8086 operating system Tim Paterson wrote for Seattle Computer Products in 1980, which Microsoft bought and turned into MS-DOS.
screenshotWaitSeconds: 30
facts:
  Written by: Tim Paterson
  Version here: "1.00"
  Price in 1980: US$95 with the company's 8086 board, US$195 without
  Became: IBM PC DOS and MS-DOS
tryThis:
  - Type a date such as 4-30-81 at the date question to reach the A prompt
  - List the files on the disk with DIR
  - Type DEL X, then ERASE X, to see which command 86-DOS knows
homepage: https://www.os2museum.com/wp/pc-86-dos/
sources:
  - https://en.wikipedia.org/wiki/86-DOS
  - https://www.os2museum.com/wp/pc-86-dos/
copyShProfile: 86dos
downloadEstimateMB: 1
screenshot: ./screenshots/86dos.png
---

86-DOS was written for the Intel 8086 computer kit made by Seattle Computer Products (SCP). The kit shipped in November 1979 but sold slowly, because it had no operating system: Digital Research's 8086 version of CP/M had been announced and then delayed. In April 1980 SCP gave 24-year-old Tim Paterson the job of writing a substitute. Inside the company it was called QDOS, for Quick and Dirty Operating System.

Paterson modeled it on CP/M's design so that existing 8-bit CP/M programs could be translated easily, and changed what he saw as CP/M's weaknesses. It wrote to the disk after every operation, so a disk removed too early wasn't corrupted, and it borrowed its file system, FAT, from Microsoft's Standalone Disk BASIC-86. By mid-1980 SCP advertised it for US$95 to owners of its 8086 board and US$195 to everyone else.

While IBM was preparing its Personal Computer, Microsoft licensed 86-DOS in December 1980 for US$25,000, hired Paterson in May 1981 to port it to the IBM PC, and in July 1981 bought all rights to it for US$50,000. Licensed to IBM, it became PC DOS 1.0, and Microsoft sold it to other companies as MS-DOS. SCP later received a US$1 million settlement after claiming in court that Microsoft had hidden its IBM deal.

86-DOS 1.00 ran on SCP's own hardware, not on PCs. In 2021 Michal Necasek of the OS/2 Museum made it boot on a PC by joining its kernel, from a disk whose newest files are dated April 1981, to the PC-specific part of a June 1981 PC DOS pre-release. On a PC it keeps SCP's habits: its prompt is A: rather than IBM's A>, and it has ERASE but no DEL.
