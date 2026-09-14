---
title: SerenityOS
maker: Andreas Kling and the SerenityOS contributors
year: 2022
family: independent
license: open-source
summary: A Unix-like desktop operating system with a 1990s look, begun by Andreas Kling in 2018, that avoids third-party code.
screenshotWaitSeconds: 180
facts:
  Began: 2018, by Andreas Kling
  Written in: C++, in its own style
  Web browser: its own, built on LibWeb
  Build here: 1.0-dev, from a November 2022 commit
tryThis:
  - Type uname -a in the open Terminal to see the build
  - List the programs that come with it using ls /bin
homepage: https://serenityos.org/
sources:
  - https://en.wikipedia.org/wiki/SerenityOS
  - https://serenityos.org/
  - https://github.com/SerenityOS/serenity/commit/1dc05fcc12d213bc82b4427d63fdec751c1f20ff
copyShProfile: serenity
downloadEstimateMB: 17
screenshot: ./screenshots/serenity.png
---

SerenityOS is a free and open-source desktop operating system with a preemptive kernel. Swedish programmer Andreas Kling, who had worked at Nokia and on Apple's WebKit team, began it in 2018 as a solo project, partly to help his recovery from addiction, and its name comes from the Serenity Prayer. It pairs the look of 1990s desktop software with a custom Unix-like core.

The project discourages third-party code, so the system has its own libraries and applications, including a web browser built on its own LibWeb, LibJS and LibWasm engines. It is written in a style its authors call Serenity C++. There is no release cycle and there are no binary releases: people build it from source. Kling's YouTube videos of his development work helped make it one of the better-known hobbyist systems.

In 2024 Kling left to develop the Ladybird browser as a separate project, and the nonprofit Ladybird Browser Initiative was founded that July. SerenityOS is still developed by its community, at a slower pace. This exhibit resumes from a state saved on copy.sh, with a Terminal open, running a 1.0-dev build from a commit dated 10 November 2022.
