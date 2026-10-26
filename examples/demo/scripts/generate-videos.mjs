#!/usr/bin/env node
// Generates the demo's placeholder clips with ffmpeg: a solid color, the scene
// name, a running timer, a short tone and, where the story has hotspots, a box
// drawn exactly where the hotspot's area is, so misalignment is easy to spot.
//
// Usage: node scripts/generate-videos.mjs [--force]
// Existing files are kept unless --force is passed.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "videos");
const force = process.argv.includes("--force");

/** Areas are fractions of the frame, the same values used in src/story.ts. */
const clips = [
  {
    name: "intro",
    title: "INTRO",
    color: "0x1e3a5f",
    size: "1280x720",
    duration: 9,
    tone: 220,
    boxes: [{ label: "PUERTA", color: "0x8b5a2b", x: 0.68, y: 0.3, width: 0.14, height: 0.5 }],
  },
  { name: "puerta", title: "PUERTA", color: "0x5b3a29", size: "1280x720", duration: 5, tone: 262 },
  { name: "bosque", title: "BOSQUE", color: "0x1f5130", size: "1280x720", duration: 5, tone: 294 },
  {
    name: "rio",
    // No ":" in titles: it would end the drawtext option.
    title: "RIO 4x3",
    color: "0x1d4e6b",
    size: "960x720",
    duration: 6,
    tone: 330,
    boxes: [{ label: "PIEDRA", color: "0x777777", x: 0.4, y: 0.52, width: 0.2, height: 0.2 }],
  },
  { name: "final", title: "FIN", color: "0x333333", size: "1280x720", duration: 4, tone: 196 },
];

try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
  console.error("ffmpeg not found. Install it (e.g. `brew install ffmpeg`) and run this again.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

for (const clip of clips) {
  const file = join(outDir, `${clip.name}.mp4`);
  if (existsSync(file) && !force) continue;

  const text = (value, size, y) =>
    `drawtext=text='${value}':fontsize=${size}:fontcolor=white:x=(w-text_w)/2:y=${y}`;
  const filters = [
    ...(clip.boxes ?? []).flatMap((box) => [
      `drawbox=x=iw*${box.x}:y=ih*${box.y}:w=iw*${box.width}:h=ih*${box.height}:color=${box.color}:t=fill`,
      `drawtext=text='${box.label}':fontsize=28:fontcolor=white` +
        `:x=w*${box.x + box.width / 2}-text_w/2:y=h*${box.y + box.height / 2}-text_h/2`,
    ]),
    text(clip.title, 96, "h*0.12"),
    text("%{pts\\:hms}", 48, "h*0.86"),
  ];

  console.log(`Generating ${clip.name}.mp4`);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel", "error",
      "-f", "lavfi", "-i", `color=c=${clip.color}:s=${clip.size}:r=30:d=${clip.duration}`,
      "-f", "lavfi", "-i", `sine=frequency=${clip.tone}:sample_rate=44100:duration=${clip.duration}`,
      "-vf", filters.join(","),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-pix_fmt", "yuv420p", "-g", "30",
      "-c:a", "aac", "-b:a", "64k",
      "-movflags", "+faststart",
      "-shortest",
      file,
    ],
    { stdio: "inherit" },
  );
}
