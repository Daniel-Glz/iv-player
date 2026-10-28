import type { HotspotKeyframe, Story } from "@ivkit/core";
import { video } from "./video";

/** Height of the top of the exhaust plume while the rocket climbs, as [second, y]. */
const climb: [number, number][] = [
  [3, 0.55],
  [4, 0.533],
  [5, 0.496],
  [6, 0.452],
  [7, 0.4],
  [8, 0.348],
  [9, 0.296],
  [10, 0.237],
  [11, 0.178],
  [12, 0.115],
  [13, 0.048],
];

// A box around the nozzles, which sit at the top of the plume. It stops at the
// top edge, where areas must start.
const engines: HotspotKeyframe[] = climb.map(([at, y]) => ({
  at,
  area: { x: 0.425, y: Math.max(0, y - 0.05), width: 0.12, height: 0.12 },
}));

export const launch: Story = {
  version: "0.1",
  start: "pad",
  scenes: {
    pad: {
      src: video("launch-pad"),
      events: [
        {
          type: "hotspot",
          id: "orion",
          from: 0.5,
          label: "Orion spacecraft",
          variant: "pulse",
          area: { x: 0.47, y: 0.05, width: 0.06, height: 0.24 },
        },
        {
          type: "hotspot",
          id: "core-stage",
          from: 2.5,
          label: "Core stage",
          variant: "pulse",
          area: { x: 0.479, y: 0.31, width: 0.042, height: 0.55 },
        },
        {
          type: "hotspot",
          id: "boosters",
          from: 4.5,
          label: "Solid rocket boosters",
          variant: "pulse",
          shape: "polygon",
          // Both boosters as one U, open at the top for the core stage between them.
          points: [
            [0.452, 0.43],
            [0.479, 0.43],
            [0.479, 0.86],
            [0.521, 0.86],
            [0.521, 0.43],
            [0.538, 0.43],
            [0.538, 0.87],
            [0.452, 0.87],
          ],
        },
        {
          type: "hotspot",
          id: "launcher",
          from: 6.5,
          label: "Mobile launcher",
          variant: "pulse",
          area: { x: 0.4, y: 0.1, width: 0.048, height: 0.76 },
        },
        {
          type: "question",
          id: "ignition",
          at: 9,
          text: "The four engines under the core stage are starting up. When do the two boosters light?",
          options: [
            { id: "now", label: "Right now, with the engines", goto: "boosters-wrong" },
            { id: "liftoff", label: "A few seconds later, at liftoff", goto: "boosters-right" },
            { id: "air", label: "Once the rocket is in the air", goto: "boosters-wrong" },
          ],
        },
      ],
    },
    "boosters-right": { src: video("launch-boosters-right"), next: "liftoff" },
    "boosters-wrong": { src: video("launch-boosters-wrong"), next: "liftoff" },
    liftoff: {
      src: video("launch-liftoff"),
      events: [
        {
          type: "hotspot",
          id: "engines",
          from: 3,
          to: 13.4,
          label: "Engines at full thrust",
          variant: "pulse",
          keyframes: engines,
        },
        {
          type: "question",
          id: "crew",
          at: 14.5,
          text: "Orion is on its way to the Moon. Who is on board?",
          options: [
            { id: "four", label: "Four astronauts", goto: "crew-wrong" },
            { id: "nobody", label: "No one: it's a test flight", goto: "crew-right" },
            { id: "one", label: "One pilot", goto: "crew-wrong" },
          ],
        },
      ],
    },
    "crew-right": { src: video("launch-crew-right") },
    "crew-wrong": { src: video("launch-crew-wrong") },
  },
};

/** What the page shows next to the player: a fact per hotspot, and the right answers. */
export const launchLesson = {
  facts: {
    orion: {
      title: "Orion",
      text: "The capsule built to carry four astronauts. The tower on top is the launch abort system, a small rocket that can pull Orion away from SLS in an emergency.",
    },
    "core-stage": {
      title: "Core stage",
      text: "The orange backbone of the rocket, 65 m (212 ft) tall. It holds about 2.7 million liters of liquid hydrogen and oxygen for the four RS-25 engines at its base.",
    },
    boosters: {
      title: "Boosters",
      text: "Two solid rocket boosters, 54 m (177 ft) tall each. They give more than 75% of the thrust at liftoff, and drop away after about two minutes.",
    },
    launcher: {
      title: "Mobile launcher",
      text: "The tower that carried the rocket to the pad and fed it propellant, power and air until the moment of liftoff.",
    },
    engines: {
      title: "Full thrust",
      text: "Together, the engines and boosters push with 8.8 million pounds (39 MN) of thrust: more than any rocket NASA had flown before.",
    },
  },
  answers: { ignition: "liftoff", crew: "nobody" },
};
