---
layout: home

hero:
  name: iv-player
  text: Interactive videos for the web
  tagline: Branching stories, questions and animated hotspots, in a Web Component under 8 KiB gzip.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Story format
      link: /reference/story-format
    - theme: alt
      text: GitHub
      link: https://github.com/Daniel-Glz/iv-player

features:
  - title: Drop-in Web Component
    details: "<iv-player> works in plain HTML or alongside any framework. Give it a story and it handles playback, questions, hotspots and controls."
  - title: Seamless branching
    details: Two stacked videos preload the next scene and swap only once its first frame can be drawn, so you never see a black frame between scenes.
  - title: Animated hotspots
    details: Rectangles, ellipses and polygons that can move and morph through keyframes, kept in step with the video frame by frame.
  - title: Framework-agnostic core
    details: "@iv-player/core is a DOM-free engine. Use it to build your own interface in React, Vue, canvas or anything else."
  - title: Validation built in
    details: validateStory checks stories from JSON or a CMS and reports each problem with a JSON Pointer to the field that caused it.
  - title: Tiny, no dependencies
    details: No third-party runtime dependencies. The standalone player, including the engine, styles and icons, stays under 8 KiB gzip.
---
