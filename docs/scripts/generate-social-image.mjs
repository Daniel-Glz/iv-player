#!/usr/bin/env node
// Generates the documentation's social preview image (Open Graph and Twitter
// cards), 1200 × 630, with ffmpeg: the logo from favicon.svg, the name, the
// tagline and the site's address.
//
// Usage: node docs/scripts/generate-social-image.mjs
// The output, docs/public/og-image.png, is committed.

import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "og-image.png");
const W = 1200;
const H = 630;

// Logo: the favicon's rounded square, play triangle and dot, scaled up.
const logo = { x: 96, y: 150, size: 200 };
const s = logo.size / 32;
const square = (() => {
  const [x0, y0, x1, y1, r] = [logo.x, logo.y, logo.x + logo.size, logo.y + logo.size, 7 * s];
  return `lte(hypot(X-clip(X,${x0 + r},${x1 - r}),Y-clip(Y,${y0 + r},${y1 - r})),${r})`;
})();
// favicon: M12 9.5 v13 l10 -6.5 z
const [tx, ty, tw, th] = [logo.x + 12 * s, logo.y + 9.5 * s, 10 * s, 13 * s];
const triangle = `between(X,${tx},${tx + tw})*lte(abs(Y-${ty + th / 2}),(${tx + tw}-X)*${th / 2 / tw})`;
const dot = `lte(hypot(X-${logo.x + 24 * s},Y-${logo.y + 9 * s}),${3 * s})`;

const background = [27, 27, 31];
const colors = { square: [91, 91, 214], triangle: [255, 255, 255], dot: [255, 209, 102] };
const channel = (i) =>
  `if(${dot},${colors.dot[i]},if(${triangle},${colors.triangle[i]},if(${square},${colors.square[i]},${background[i]})))`;

const text = (value, size, color, y) =>
  `drawtext=text='${value}':fontsize=${size}:fontcolor=${color}:x=${logo.x + logo.size + 64}:y=${y}`;

execFileSync(
  "ffmpeg",
  [
    "-y", "-loglevel", "error",
    "-f", "lavfi", "-i", `color=c=black:s=${W}x${H}:d=1`,
    "-vf", [
      `format=rgb24,geq=r='${channel(0)}':g='${channel(1)}':b='${channel(2)}'`,
      text("IVKit", 104, "white", 150),
      text("Interactive videos for the web", 46, "0xd0d0e0", 278),
      text("Branching stories, questions and animated hotspots", 28, "0x9a9ab0", 352),
      `drawtext=text='daniel-glz.github.io/ivkit':fontsize=28:fontcolor=0xa5a5ff:x=${logo.x}:y=${H - 96}`,
    ].join(","),
    "-frames:v", "1",
    out,
  ],
  { stdio: "inherit" },
);
console.log(`Wrote ${out}`);
