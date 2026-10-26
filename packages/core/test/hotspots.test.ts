import { describe, expect, it } from "vitest";
import { StoryEngine, type Story } from "../src/index";

const area = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };

/**
 * room: "door" (2–6s, branches) and "lamp" (4s–end, reports only),
 * plus a question at 8s.
 */
const room: Story = {
  version: "0.1",
  start: "room",
  scenes: {
    room: {
      src: "room.mp4",
      next: "outro",
      events: [
        { type: "hotspot", id: "door", from: 2, to: 6, area, label: "Puerta", goto: "hall" },
        { type: "hotspot", id: "lamp", from: 4, area, label: "Lámpara" },
        { type: "question", id: "stay", at: 8, text: "¿Te quedas?", options: [{ id: "yes", label: "Sí" }] },
      ],
    },
    hall: { src: "hall.mp4" },
    outro: { src: "outro.mp4" },
  },
};

/** Records `hotspots` emissions as lists of ids, plus scene/hotspot/end markers. */
function record(engine: StoryEngine) {
  const log: (string | string[])[] = [];
  engine.on("hotspots", (e) => log.push(e.hotspots.map((h) => h.id)));
  engine.on("hotspot", (e) => log.push(`hotspot:${e.hotspot.id}`));
  engine.on("interaction", (e) => log.push(`interaction:${e.question.id}`));
  engine.on("scene", (e) => log.push(`scene:${e.sceneId}`));
  engine.on("end", () => log.push("end"));
  return log;
}

describe("StoryEngine hotspots", () => {
  it("shows hotspots within [from, to) and emits only on changes", () => {
    const engine = new StoryEngine(room);
    const log = record(engine);
    engine.start();
    for (const t of [0, 1.9, 2, 3, 4, 5, 6, 7]) engine.update(t);

    expect(log).toEqual(["scene:room", ["door"], ["door", "lamp"], ["lamp"]]);
    expect(engine.visibleHotspots.map((h) => h.id)).toEqual(["lamp"]);
  });

  it("recomputes visibility when seeking backwards", () => {
    const engine = new StoryEngine(room);
    const log = record(engine);
    engine.start();
    engine.update(7);
    engine.update(3);
    engine.update(0);

    expect(log).toEqual(["scene:room", ["lamp"], ["door"], []]);
  });

  it("hides hotspots while a question is showing and restores them after", () => {
    const engine = new StoryEngine(room);
    const log = record(engine);
    engine.start();
    engine.update(7);
    engine.update(8);
    engine.answer("yes");
    engine.update(8.1);

    expect(log).toEqual(["scene:room", ["lamp"], [], "interaction:stay", ["lamp"]]);
  });

  it("branches when activating a hotspot with goto, hiding it first", () => {
    const engine = new StoryEngine(room);
    const log = record(engine);
    engine.start();
    engine.update(3);

    expect(engine.activate("door")).toBe(true);
    expect(log).toEqual(["scene:room", ["door"], "hotspot:door", [], "scene:hall"]);
    expect(engine.currentSceneId).toBe("hall");
    expect(engine.visibleHotspots).toEqual([]);
  });

  it("only reports hotspots without goto, and playback continues", () => {
    const engine = new StoryEngine(room);
    const log = record(engine);
    engine.start();
    engine.update(7);

    expect(engine.activate("lamp")).toBe(true);
    expect(log.at(-1)).toBe("hotspot:lamp");
    expect(engine.currentSceneId).toBe("room");
    expect(engine.state).toBe("playing");
  });

  it("rejects activating hotspots that aren't on screen", () => {
    const engine = new StoryEngine(room);
    engine.start();
    expect(engine.activate("door")).toBe(false);

    engine.update(7);
    expect(engine.activate("door")).toBe(false);
    expect(engine.activate("nope")).toBe(false);

    engine.update(8);
    expect(engine.activate("lamp")).toBe(false);
  });

  it("clears hotspots when the scene ends", () => {
    const engine = new StoryEngine({
      version: "0.1",
      start: "only",
      scenes: { only: { src: "only.mp4", events: [{ type: "hotspot", id: "h", from: 0, area, label: "H" }] } },
    });
    const log = record(engine);
    engine.start();
    engine.update(0);
    engine.mediaEnded();

    expect(log).toEqual(["scene:only", ["h"], [], "end"]);
  });
});
