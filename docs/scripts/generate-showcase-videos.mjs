#!/usr/bin/env node
// Cuts the clips of the showcase examples from real footage, with ffmpeg. Unlike
// the placeholder clips, these come from public-domain and CC0 videos, downloaded
// once into the system's temporary directory.
//
// Usage: node docs/scripts/generate-showcase-videos.mjs [--force]
// Existing files are kept unless --force is passed. The output is committed.
//
// Hotspot areas in docs/examples/stories/launch.ts and traffic.ts are measured
// on these exact cuts: changing a crop or a start time moves the picture under them.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "examples", "videos");
const force = process.argv.includes("--force");

const sources = {
  // "Artemis I Slow Motion Liftoff", NASA/Frank Michaux, 16 November 2022.
  // https://images.nasa.gov/details/KSC-20221116--MH-FMX-01-0001-Artemis_1_slowmo_liftoff-3314595
  artemis:
    "https://images-assets.nasa.gov/video/KSC-20221116--MH-FMX-01-0001-Artemis_1_slowmo_liftoff-3314595/KSC-20221116--MH-FMX-01-0001-Artemis_1_slowmo_liftoff-3314595~medium.mp4",
  // "Roundabout 14 61", Wikideas1, CC0, 8 September 2023. US 14/61 in La Crosse, Wisconsin.
  // https://commons.wikimedia.org/wiki/File:Roundabout_14_61.webm
  roundabout: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Roundabout_14_61.webm",
  // Timelapses by Yellowstone National Park (YellowstoneNPS), public domain, September 2017.
  // https://commons.wikimedia.org/wiki/File:Old_Faithful_eruption_timelapse_(36948540241).webm
  faithful:
    "https://upload.wikimedia.org/wikipedia/commons/d/db/Old_Faithful_eruption_timelapse_%2836948540241%29.webm",
  overlook:
    "https://upload.wikimedia.org/wikipedia/commons/1/1a/Grand_Prismatic_Spring_Overlook_timelapse_%2836254802534%29.webm",
  boardwalk:
    "https://upload.wikimedia.org/wikipedia/commons/5/5a/Grand_Prismatic_Spring_boardwalk_timelapse_%2836948603771%29.webm",
};

/** 16:9 window around the rocket, in pixels of the 1280×674 source. */
const rocket = "crop=889:500:183:130";
/** The launch is at night: denoise, then lift the shadows so the rocket shows. */
const night = ["hqdn3d", "eq=gamma=1.3"];
const vertical = "540:960";
/** Timelapses change in every frame, so they take more compression to stay small. */
const timelapse = 33;

const clips = [
  { name: "launch-pad", source: "artemis", crop: rocket, look: night, from: 15, duration: 9.5 },
  {
    name: "launch-boosters-right",
    source: "artemis",
    crop: rocket,
    look: night,
    from: 24,
    duration: 7,
    title: "Correct!",
    caption: "Boosters can't be shut off once lit, so they ignite last.",
  },
  {
    name: "launch-boosters-wrong",
    source: "artemis",
    crop: rocket,
    look: night,
    from: 24,
    duration: 7,
    title: "Not quite",
    caption: "Engines first. Boosters can't be shut off, so they light last.",
  },
  { name: "launch-liftoff", source: "artemis", crop: rocket, look: night, from: 31, duration: 15 },
  {
    name: "launch-crew-right",
    source: "artemis",
    crop: rocket,
    look: night,
    from: 48,
    duration: 7,
    title: "Correct!",
    caption: "Artemis I flew uncrewed: a mannequin rode in Orion.",
  },
  {
    name: "launch-crew-wrong",
    source: "artemis",
    crop: rocket,
    look: night,
    from: 48,
    duration: 7,
    title: "Not this time",
    caption: "Artemis I was an uncrewed test: a mannequin rode in Orion.",
  },
  // The roundabout and its four roads, in pixels of the 1920×1080 source.
  { name: "traffic", source: "roundabout", crop: "crop=1440:810:240:135", from: 5, duration: 12.5 },
  // Vertical, for the stories player: 9:16 windows of the 1920×1080 sources.
  {
    name: "yellowstone-old-faithful",
    source: "faithful",
    crop: "crop=608:1080:598:0",
    size: vertical,
    crf: timelapse,
    from: 6,
    duration: 12,
  },
  {
    name: "yellowstone-overlook",
    source: "overlook",
    crop: "crop=608:1080:426:0",
    size: vertical,
    crf: timelapse,
    from: 24,
    duration: 10,
  },
  {
    name: "yellowstone-boardwalk",
    source: "boardwalk",
    crop: "crop=608:1080:656:0",
    size: vertical,
    crf: timelapse,
    from: 1,
    duration: 10,
  },
];

try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
  console.error("ffmpeg not found. Install it (e.g. `brew install ffmpeg`) and run this again.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
// Kept between runs, so the source is only downloaded once.
const cache = join(tmpdir(), "ivkit-showcase");
mkdirSync(cache, { recursive: true });

const ffmpeg = (args) =>
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });

async function download(name) {
  const file = join(cache, `${name}${extname(new URL(sources[name]).pathname)}`);
  if (existsSync(file)) return file;
  console.log(`Downloading ${sources[name]}`);
  const response = await fetch(sources[name]);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  return file;
}

for (const clip of clips) {
  const file = join(outDir, `${clip.name}.mp4`);
  if (existsSync(file) && !force) continue;

  const source = await download(clip.source);
  const size = clip.size ?? "960:540";
  const filters = [clip.crop, `scale=${size}:flags=lanczos`, ...(clip.look ?? []), "fps=30"];
  if (clip.title) {
    // Text goes through files, so captions can hold any character.
    const title = join(cache, `${clip.name}.title.txt`);
    const caption = join(cache, `${clip.name}.caption.txt`);
    writeFileSync(title, clip.title);
    writeFileSync(caption, clip.caption);
    // At the top, clear of the player's control bar. Captions must fit on one
    // line: drawtext doesn't wrap.
    filters.push(
      "drawbox=x=0:y=0:w=iw:h=118:color=black@0.55:t=fill",
      `drawtext=textfile='${title}':fontsize=40:fontcolor=white:x=(w-text_w)/2:y=20`,
      `drawtext=textfile='${caption}':fontsize=24:fontcolor=white@0.9:x=(w-text_w)/2:y=76`,
    );
  }

  console.log(`Cutting ${clip.name}.mp4`);
  ffmpeg([
    "-ss",
    String(clip.from),
    "-i",
    source,
    "-t",
    String(clip.duration),
    "-vf",
    filters.join(","),
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    String(clip.crf ?? 28),
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
