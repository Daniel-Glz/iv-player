---
layout: home
title: "IVKit: interactive video player for the web"
titleTemplate: false

hero:
  name: IVKit
  text: Interactive videos for the web
  tagline: Branching stories, questions and animated hotspots. Use the ready-made Web Component, under 8.5 KiB gzip, or build your own player on the same engine.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Build your own player
      link: /guide/core
    - theme: alt
      text: Live examples
      link: /examples/

features:
  - title: Drop-in Web Component
    details: "<ivkit-player> works in plain HTML or alongside any framework. Give it a story and it handles playback, questions, hotspots and controls."
  - title: No black frames between scenes
    details: Two stacked videos preload the next scene and swap only once its first frame can be drawn, so you never see a black frame between scenes.
  - title: Animated hotspots
    details: Rectangles, ellipses and polygons that can move and morph through keyframes, kept in step with the video frame by frame.
  - title: Or no player at all
    details: "@ivkit/core is the DOM-free engine behind the player. Build your own interface in React, Vue, a canvas or a game engine, with the same stories."
    link: /guide/core
    linkText: Custom players with core
  - title: Validation built in
    details: validateStory checks stories from JSON or a CMS and reports each problem with a JSON Pointer to the field that caused it.
  - title: Tiny, no dependencies
    details: No third-party runtime dependencies. The standalone player, including the engine, styles and icons, stays under 8.5 KiB gzip.
---
