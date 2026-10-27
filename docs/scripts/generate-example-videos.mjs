#!/usr/bin/env node
// Generates the placeholder clips used by the live examples, with ffmpeg: a
// background with the objects hotspots point at, a title, a caption and a
// running timer. Objects are drawn from the same fractions used in the stories
// (docs/.vitepress/theme/examples/*.ts), so hotspots line up with the picture.
//
// Usage: node docs/scripts/generate-example-videos.mjs [--force]
// Existing files are kept unless --force is passed. The output is committed.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "examples", "videos");
const force = process.argv.includes("--force");
const W = 960;
const H = 540;

/** Fractions of the frame; keep in sync with the hotspots of the stories. */
const shapes = {
  door: { kind: "rect", x: 0.1, y: 0.35, width: 0.16, height: 0.5, color: [139, 90, 43] },
  sun: { kind: "ellipse", x: 0.42, y: 0.15, width: 0.16, height: 0.3, color: [255, 209, 102] },
  mountain: { kind: "triangle", x: 0.66, y: 0.4, width: 0.3, height: 0.45, color: [120, 132, 145] },
  key: { kind: "rect", x: 0.885, y: 0.1, width: 0.03, height: 0.05, color: [196, 168, 72] },
};

/** Keyframes of the moving ball, as [time, x, y] of its top-left corner. */
const ballPath = [
  [1, 0.08, 0.6],
  [4, 0.45, 0.15],
  [7, 0.8, 0.55],
];
const ballSize = { width: 0.1, height: 0.1778 };

const clips = [
  {
    name: "adventure-intro",
    color: [30, 58, 95],
    duration: 6,
    title: "THE CROSSROADS",
    caption: "A question appears at 4 seconds",
  },
  {
    name: "adventure-forest",
    color: [31, 81, 48],
    duration: 4,
    title: "THE FOREST",
    caption: "You chose the forest",
  },
  {
    name: "adventure-city",
    color: [74, 45, 92],
    duration: 4,
    title: "THE CITY",
    caption: "You chose the city",
  },
  {
    name: "quiz-question",
    color: [43, 45, 66],
    duration: 5,
    title: "QUICK QUIZ",
    caption: "What is 7 x 6?",
  },
  {
    name: "quiz-wrong",
    color: [141, 43, 43],
    duration: 3,
    title: "NOT QUITE",
    caption: "Try that again",
  },
  {
    name: "quiz-right",
    color: [43, 122, 75],
    duration: 3,
    title: "CORRECT!",
    caption: "7 x 6 = 42",
  },
  {
    name: "shapes",
    color: [34, 48, 60],
    duration: 12,
    title: "",
    caption: "Click the shapes. Find the hidden key.",
    objects: ["door", "sun", "mountain", "key"],
  },
  {
    name: "tracking",
    color: [16, 50, 74],
    duration: 9,
    title: "",
    caption: "Catch the ball",
    ball: true,
  },
  {
    name: "tracking-caught",
    color: [43, 122, 75],
    duration: 3,
    title: "GOT IT!",
    caption: "The hotspot followed the ball",
  },
  {
    name: "tracking-missed",
    color: [90, 60, 30],
    duration: 3,
    title: "TOO SLOW",
    caption: "Replay to try again",
  },
];

try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
  console.error("ffmpeg not found. Install it (e.g. `brew install ffmpeg`) and run this again.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const work = join(tmpdir(), `ivkit-examples-${process.pid}`);
mkdirSync(work, { recursive: true });

const ffmpeg = (args) =>
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });

/** geq condition that's true inside `shape`, in pixel coordinates X and Y. */
function inside({ kind, x, y, width, height }) {
  const [x0, y0, w, h] = [x * W, y * H, width * W, height * H];
  switch (kind) {
    case "rect":
      return `between(X,${x0},${x0 + w})*between(Y,${y0},${y0 + h})`;
    case "ellipse":
      return `lt(pow((X-${x0 + w / 2})/${w / 2},2)+pow((Y-${y0 + h / 2})/${h / 2},2),1)`;
    case "triangle":
      // Apex at the top center, base along the bottom edge.
      return `between(Y,${y0},${y0 + h})*lte(abs(X-${x0 + w / 2}),(Y-${y0})*${w / 2 / h})`;
  }
}

/** Draws `objects` over a solid `color` into a PNG. */
function background(file, color, objects) {
  const channel = (i) =>
    objects.reduceRight(
      (rest, name) => `if(${inside(shapes[name])},${shapes[name].color[i]},${rest})`,
      String(color[i]),
    );
  ffmpeg([
    "-f",
    "lavfi",
    "-i",
    `color=c=black:s=${W}x${H}:d=1`,
    "-vf",
    `format=rgb24,geq=r='${channel(0)}':g='${channel(1)}':b='${channel(2)}'`,
    "-frames:v",
    "1",
    file,
  ]);
}

/** Piecewise-linear expression of `t` through `[time, value]` points, holding at both ends. */
function path(points) {
  let expr = String(points.at(-1)[1]);
  for (let i = points.length - 2; i >= 0; i--) {
    const [t0, v0] = points[i];
    const [t1, v1] = points[i + 1];
    expr = `if(lt(t,${t1}),${v0}+(${v1 - v0})*(t-${t0})/${t1 - t0},${expr})`;
  }
  return `if(lt(t,${points[0][0]}),${points[0][1]},${expr})`;
}

const ball = join(work, "ball.png");
const [bw, bh] = [Math.round(ballSize.width * W), Math.round(ballSize.height * H)];
ffmpeg([
  "-f",
  "lavfi",
  "-i",
  `color=c=black:s=${bw}x${bh}:d=1`,
  "-vf",
  `format=rgba,geq=r=255:g=120:b=90:a='255*lt(hypot(X-${bw / 2},Y-${bh / 2}),${bw / 2 - 1})'`,
  "-frames:v",
  "1",
  ball,
]);

for (const clip of clips) {
  const file = join(outDir, `${clip.name}.mp4`);
  if (existsSync(file) && !force) continue;

  const bg = join(work, `${clip.name}.png`);
  background(bg, clip.color, clip.objects ?? []);

  // No "'" or ":" in titles and captions: they would end the drawtext option.
  const text = (value, size, x, y) =>
    `drawtext=text='${value}':fontsize=${size}:fontcolor=white:x=${x}:y=${y}`;
  const centered = "(w-text_w)/2";
  const overlays = [
    // Without a title, the caption goes in the top left corner, clear of the
    // objects and of the player's control bar.
    ...(clip.title
      ? [text(clip.title, 72, centered, "h*0.38"), text(clip.caption, 30, centered, "h*0.56")]
      : [text(clip.caption, 26, 24, 22)]),
    `drawtext=text='%{pts\\:hms}':fontsize=22:fontcolor=white@0.7:x=w-text_w-20:y=20`,
  ].join(",");

  const inputs = ["-loop", "1", "-framerate", "30", "-t", String(clip.duration), "-i", bg];
  let graph = `[0:v]${overlays}[v]`;
  if (clip.ball) {
    inputs.push("-loop", "1", "-framerate", "30", "-t", String(clip.duration), "-i", ball);
    const x = path(ballPath.map(([t, px]) => [t, px])).replaceAll(",", "\\,");
    const y = path(ballPath.map(([t, , py]) => [t, py])).replaceAll(",", "\\,");
    graph = `[0:v][1:v]overlay=x=W*(${x}):y=H*(${y}),${overlays}[v]`;
  }

  console.log(`Generating ${clip.name}.mp4`);
  ffmpeg([
    ...inputs,
    "-filter_complex",
    graph,
    "-map",
    "[v]",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "30",
    "-pix_fmt",
    "yuv420p",
    "-g",
    "30",
    "-movflags",
    "+faststart",
    "-an",
    file,
  ]);
}

rmSync(work, { recursive: true, force: true });
