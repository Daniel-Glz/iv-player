import { describe, expect, it } from "vitest";
import { MediaController, StoryEngine, type Story } from "../src/index";
import { FakeMedia, type FakeMediaOptions } from "./fixtures/fake-media";

const area = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };

/** intro asks at 5s: "a" → left → outro, "b" → right. */
const story: Story = {
  version: "0.1",
  start: "intro",
  scenes: {
    intro: {
      src: "intro.mp4",
      events: [
        {
          type: "question",
          id: "q",
          at: 5,
          text: "¿Izquierda o derecha?",
          options: [
            { id: "a", label: "Izquierda", goto: "left" },
            { id: "b", label: "Derecha", goto: "right" },
          ],
        },
      ],
    },
    left: { src: "left.mp4", next: "outro" },
    right: { src: "right.mp4" },
    outro: { src: "outro.mp4" },
  },
};

function setup(options: FakeMediaOptions = {}) {
  const engine = new StoryEngine(story);
  const a = new FakeMedia("a", options);
  const b = new FakeMedia("b", options);
  const controller = new MediaController(engine, [a, b]);
  const swaps: string[] = [];
  controller.on("swap", ({ active }) => swaps.push(active.name));
  return { engine, controller, a, b, swaps };
}

/** Starts the story and lets the intro load: `b` ends up on top, `a` preloading "left". */
function started(options: FakeMediaOptions = {}) {
  const ctx = setup(options);
  ctx.engine.start();
  ctx.b.finishLoading();
  return ctx;
}

/** Lets pending promise callbacks run (core's test env has no timers in scope). */
async function flush() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe("MediaController timing source", () => {
  it("uses the frame's mediaTime, ignoring timeupdate while frames keep arriving", () => {
    const { engine, b } = started({ frameCallbacks: true });

    b.presentFrame(4.9);
    b.timeUpdate(5.2);
    expect(engine.state).toBe("playing");

    b.presentFrame(5);
    expect(engine.state).toBe("interacting");
  });

  it("lets timeupdate drive when frames stop arriving, as in a background tab", () => {
    const { engine, b } = started({ frameCallbacks: true });
    b.presentFrame(1);
    b.timeUpdate(1.25);
    expect(engine.state).toBe("playing");

    // Tab hidden: no more frames, only throttled timeupdates.
    b.timeUpdate(5.2);
    expect(engine.state).toBe("interacting");
  });

  it("keeps a frame callback scheduled on each element", () => {
    const { a, b } = started({ frameCallbacks: true });
    b.presentFrame(1);
    b.presentFrame(2);
    a.presentFrame(0);

    expect(a.pendingFrameCallbacks()).toBe(1);
    expect(b.pendingFrameCallbacks()).toBe(1);
  });

  it("ignores frames from the hidden element", () => {
    const { engine, a } = started({ frameCallbacks: true });
    a.presentFrame(6);
    expect(engine.state).toBe("playing");
  });

  it("falls back to timeupdate without frame callbacks", () => {
    const { engine, b } = started();

    expect(b.listenerCount("timeupdate")).toBe(1);
    b.timeUpdate(5.2);
    expect(engine.state).toBe("interacting");
  });

  it("reports every time it gives the engine as a time event, from the front element only", () => {
    const { controller, a, b } = started({ frameCallbacks: true });
    const times: [string, number][] = [];
    controller.on("time", ({ media, time }) => times.push([media.name, time]));

    b.presentFrame(1);
    b.timeUpdate(1.1);
    b.timeUpdate(1.25);
    a.presentFrame(0);

    expect(times).toEqual([
      ["b", 1],
      ["b", 1.25],
    ]);
  });

  it("emits no time event when the update itself leaves the scene", () => {
    const { controller, engine, b } = started({ frameCallbacks: true });
    const times: number[] = [];
    controller.on("time", ({ time }) => times.push(time));
    // Answering right away branches to "left" within the same update.
    engine.on("interaction", () => engine.answer("a"));

    b.presentFrame(5);
    expect(engine.currentSceneId).toBe("left");
    expect(times).toEqual([]);
  });

  it("cancels pending frame callbacks on destroy", () => {
    const { controller, engine, a, b } = started({ frameCallbacks: true });
    controller.destroy();

    expect(a.pendingFrameCallbacks()).toBe(0);
    expect(b.pendingFrameCallbacks()).toBe(0);
    b.presentFrame(5);
    expect(engine.state).toBe("playing");
  });
});

describe.each([
  ["requestVideoFrameCallback", { frameCallbacks: true }],
  ["timeupdate", { frameCallbacks: false }],
] as const)("MediaController (%s)", (_mode, options) => {
  it("reveals the first scene only once it can draw a frame", () => {
    const { engine, b, swaps } = setup(options);
    engine.start();

    expect(b.src).toBe("intro.mp4");
    expect(swaps).toEqual([]);

    b.finishLoading();
    expect(swaps).toEqual(["b"]);
    expect(b.playing).toBe(true);
  });

  it("preloads the first branch target in the hidden element", () => {
    const { a, controller } = started(options);
    expect(a.src).toBe("left.mp4");
    expect(a.preload).toBe("auto");
    expect(controller.active.name).toBe("b");
  });

  it("drives the engine from the front element only", () => {
    const { engine, a, b } = started(options);
    a.advanceTo(6);
    expect(engine.state).toBe("playing");

    b.advanceTo(5.2);
    expect(engine.state).toBe("interacting");
  });

  it("pauses on the question's exact time", () => {
    const { b } = started(options);
    b.advanceTo(5.2);

    expect(b.playing).toBe(false);
    expect(b.currentTime).toBe(5);
  });

  it("resumes the same element when an answer doesn't branch", () => {
    const engine = new StoryEngine({
      version: "0.1",
      start: "s",
      scenes: {
        s: {
          src: "s.mp4",
          events: [
            { type: "question", id: "q", at: 1, text: "¿?", options: [{ id: "ok", label: "Ok" }] },
          ],
        },
      },
    });
    const a = new FakeMedia("a", options);
    const b = new FakeMedia("b", options);
    new MediaController(engine, [a, b]);
    engine.start();
    b.finishLoading();
    b.advanceTo(1);
    engine.answer("ok");

    expect(b.playing).toBe(true);
    expect(a.playing).toBe(false);
  });

  it("pauses on a pausing hotspot's start and resumes when it's activated", () => {
    const engine = new StoryEngine({
      version: "0.1",
      start: "s",
      scenes: {
        s: {
          src: "s.mp4",
          events: [{ type: "hotspot", id: "h", from: 1, area, label: "H", pause: true }],
        },
      },
    });
    const a = new FakeMedia("a", options);
    const b = new FakeMedia("b", options);
    new MediaController(engine, [a, b]);
    engine.start();
    b.finishLoading();
    b.advanceTo(1.2);

    expect(b.playing).toBe(false);
    expect(b.currentTime).toBe(1);

    engine.activate("h");
    expect(b.playing).toBe(true);
  });

  it("seeks the active element when resuming from another time", () => {
    const engine = new StoryEngine({
      version: "0.1",
      start: "s",
      scenes: {
        s: {
          src: "s.mp4",
          events: [
            { type: "hotspot", id: "h", from: 1, area, label: "H", pause: true, seek: 4 },
            {
              type: "question",
              id: "q",
              at: 6,
              text: "?",
              options: [
                { id: "same", label: "Same" },
                { id: "back", label: "Back", seek: 2 },
              ],
            },
          ],
        },
      },
    });
    const a = new FakeMedia("a", options);
    const b = new FakeMedia("b", options);
    new MediaController(engine, [a, b]);
    engine.start();
    b.finishLoading();
    b.advanceTo(1.2);
    engine.activate("h");
    expect(b.currentTime).toBe(4);
    expect(b.playing).toBe(true);

    b.advanceTo(6);
    engine.answer("back");
    expect(b.currentTime).toBe(2);
    expect(b.playing).toBe(true);

    // The seek re-armed the question; without a seek, it resumes where it paused.
    b.advanceTo(6);
    engine.answer("same");
    expect(b.currentTime).toBe(6);
    expect(b.playing).toBe(true);
  });

  it("resumes a pausing hotspot only when none of its branches holds", () => {
    const engine = new StoryEngine({
      version: "0.1",
      start: "s",
      vars: { open: false },
      scenes: {
        s: {
          src: "s.mp4",
          events: [
            {
              type: "hotspot",
              id: "h",
              from: 1,
              area,
              label: "H",
              pause: true,
              branches: [{ if: { var: "open", eq: true }, goto: "t" }],
            },
          ],
        },
        t: { src: "t.mp4" },
      },
    });
    const a = new FakeMedia("a", options);
    const b = new FakeMedia("b", options);
    new MediaController(engine, [a, b]);
    engine.start();
    b.finishLoading();
    b.advanceTo(1.2);
    // The first branch is preloaded as the likely one.
    expect(a.src).toBe("t.mp4");

    engine.activate("h");
    expect(b.playing).toBe(true);

    engine.goTo("s");
    b.advanceTo(1.2);
    engine.setVar("open", true);
    engine.activate("h");
    expect(engine.currentSceneId).toBe("t");
    expect(b.playing).toBe(false);
  });

  it("swaps instantly to a preloaded branch", () => {
    const { engine, a, b, swaps } = started(options);
    a.finishLoading();
    b.advanceTo(5);
    engine.answer("a");

    expect(swaps).toEqual(["b", "a"]);
    expect(a.playing).toBe(true);
    expect(b.playing).toBe(false);
    // The freed element starts buffering what comes after "left".
    expect(b.src).toBe("outro.mp4");
  });

  it("keeps the last frame on screen until a non-preloaded branch is ready", () => {
    const { engine, a, b, swaps } = started(options);
    b.advanceTo(5);
    engine.answer("b");

    expect(a.src).toBe("right.mp4");
    expect(swaps).toEqual(["b"]);
    expect(b.playing).toBe(false);

    a.finishLoading();
    expect(swaps).toEqual(["b", "a"]);
    expect(a.playing).toBe(true);
  });

  it("ignores time updates from the old scene while swapping", () => {
    const { engine, a, b } = started(options);
    b.advanceTo(5);
    engine.answer("b");
    b.advanceTo(9);
    b.end();

    expect(engine.currentSceneId).toBe("right");
    expect(engine.state).toBe("playing");
    a.finishLoading();
  });

  it("advances to the next scene when the front element ends", () => {
    const { engine, a, b, swaps } = started(options);
    a.finishLoading();
    b.advanceTo(5);
    engine.answer("a");
    b.finishLoading();
    a.end();

    expect(engine.currentSceneId).toBe("outro");
    expect(swaps).toEqual(["b", "a", "b"]);
    expect(b.playing).toBe(true);
  });

  it("rewinds in place when re-entering the scene on screen, dropping a pending swap", () => {
    const { engine, controller, a, b, swaps } = started(options);
    b.advanceTo(5);
    engine.answer("b");
    engine.start();

    expect(b.currentTime).toBe(0);
    a.finishLoading();
    expect(swaps).toEqual(["b"]);

    b.finishSeek();
    expect(b.playing).toBe(true);
    expect(controller.active).toBe(b);
  });

  it("starts a scene at the time goTo() gives, revealing it once it's there", () => {
    const { engine, a, swaps } = started(options);
    engine.goTo("right", 3);
    expect(a.src).toBe("right.mp4");
    expect(a.currentTime).toBe(3);

    a.finishLoading();
    expect(swaps).toEqual(["b"]);
    a.finishSeek();
    expect(swaps).toEqual(["b", "a"]);
    expect(a.playing).toBe(true);
  });

  it("starts a preloaded scene at the time goTo() gives", () => {
    const { engine, a, swaps } = started(options);
    a.finishLoading();
    engine.goTo("left", 2);
    expect(a.currentTime).toBe(2);
    expect(swaps).toEqual(["b"]);

    a.finishSeek();
    expect(swaps).toEqual(["b", "a"]);
  });

  it("seeks in place when goTo() re-enters the scene on screen at a time", () => {
    const { engine, controller, b } = started(options);
    b.advanceTo(2);
    engine.goTo("intro", 4);
    expect(b.currentTime).toBe(4);

    b.finishSeek();
    expect(b.playing).toBe(true);
    expect(controller.active).toBe(b);
  });

  it("doesn't play the previous scene while the next one loads", () => {
    const { engine, controller, a, b } = started(options);
    b.advanceTo(5);
    engine.answer("b");
    controller.play();
    expect(b.playing).toBe(false);

    b.playing = true;
    a.finishLoading();
    expect(b.playing).toBe(false);
    expect(a.playing).toBe(true);
  });

  it("seeks the scene loading, not the previous one", () => {
    const { engine, a, b } = started(options);
    b.advanceTo(3);
    engine.goTo("right");
    engine.seek(2);
    expect(a.currentTime).toBe(2);
    expect(b.currentTime).toBe(3);
  });

  it("reports a scene that fails to load, keeps the last frame, and retries", () => {
    const { engine, controller, a, b, swaps } = started(options);
    const errors: unknown[] = [];
    controller.on("error", ({ media, sceneId, error }) =>
      errors.push([media.name, sceneId, error]),
    );
    b.advanceTo(5);
    engine.answer("b");
    a.fail();

    expect(errors).toEqual([["a", "right", { code: 4 }]]);
    a.finishLoading();
    controller.play();
    expect(swaps).toEqual(["b"]);
    expect(b.playing).toBe(false);

    controller.retry();
    expect(a.src).toBe("right.mp4");
    expect(a.error).toBeNull();
    a.finishLoading();
    expect(swaps).toEqual(["b", "a"]);
    expect(a.playing).toBe(true);
  });

  it("reports the scene playing when it fails, and retries from where it failed", () => {
    const { controller, a, b, swaps } = started(options);
    const errors: string[] = [];
    controller.on("error", ({ sceneId }) => errors.push(sceneId));
    b.advanceTo(3);
    b.fail();
    expect(errors).toEqual(["intro"]);

    controller.retry();
    expect(a.src).toBe("intro.mp4");
    expect(a.currentTime).toBe(3);
    a.finishLoading();
    a.finishSeek();
    expect(swaps).toEqual(["b", "a"]);
  });

  it("loads a failed preload again when its scene comes, without reporting it", () => {
    const { engine, controller, a, b, swaps } = started(options);
    const errors: unknown[] = [];
    controller.on("error", (e) => errors.push(e));
    a.fail();
    b.advanceTo(5);
    engine.answer("a");

    expect(errors).toEqual([]);
    expect(a.src).toBe("left.mp4");
    expect(a.error).toBeNull();
    a.finishLoading();
    expect(swaps).toEqual(["b", "a"]);
  });

  it("does not preload over a pending swap or the scene on screen", () => {
    const { engine, controller, a, b } = started(options);
    controller.preload("intro");
    expect(a.src).toBe("left.mp4");

    b.advanceTo(5);
    engine.answer("b");
    controller.preload("outro");
    expect(a.src).toBe("right.mp4");
  });

  it("reports blocked playback and retries on play()", async () => {
    const { engine, controller, b } = setup(options);
    const blocked: unknown[] = [];
    controller.on("blocked", ({ error }) => blocked.push(error));
    b.playResult = () =>
      Promise.reject(Object.assign(new Error("blocked"), { name: "NotAllowedError" }));
    engine.start();
    b.finishLoading();
    await flush();

    expect(blocked).toHaveLength(1);
    expect(b.playing).toBe(false);

    b.playResult = () => Promise.resolve();
    controller.play();
    expect(b.playing).toBe(true);
  });

  it("reports only the autoplay policy as blocked, not an interrupted play()", async () => {
    const { engine, controller, b } = setup(options);
    const blocked: unknown[] = [];
    controller.on("blocked", ({ error }) => blocked.push(error));
    b.playResult = () => Promise.reject(Object.assign(new Error("paused"), { name: "AbortError" }));
    engine.start();
    b.finishLoading();
    await flush();
    expect(blocked).toEqual([]);
  });

  it("detaches from the engine and the media on destroy", () => {
    const { engine, controller, a, b, swaps } = setup(options);
    controller.destroy();

    expect(a.listenerCount()).toBe(0);
    expect(b.listenerCount()).toBe(0);
    engine.start();
    expect(b.src).toBe("");
    expect(swaps).toEqual([]);
  });
});

describe("MediaController with question targets", () => {
  it("preloads the goto of a question whose options don't branch", () => {
    const engine = new StoryEngine({
      version: "0.1",
      start: "s",
      scenes: {
        s: {
          src: "s.mp4",
          events: [
            {
              type: "question",
              id: "q",
              at: 1,
              text: "?",
              multiple: true,
              options: [{ id: "a", label: "A" }],
              goto: "t",
            },
          ],
        },
        t: { src: "t.mp4" },
      },
    });
    const a = new FakeMedia("a");
    const b = new FakeMedia("b");
    new MediaController(engine, [a, b]);
    engine.start();
    b.finishLoading();
    expect(a.src).toBe("t.mp4");
  });
});
