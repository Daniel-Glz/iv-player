import type { Hotspot, Story } from "@ivkit/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/index";

const area = { x: 0.2, y: 0.2, width: 0.2, height: 0.4 };

const hotspots: Hotspot[] = [
  { type: "hotspot", id: "plain", from: 0, label: "Plain", area },
  { type: "hotspot", id: "oval", from: 0, label: "Oval", area, shape: "ellipse", variant: "pulse" },
  { type: "hotspot", id: "tag", from: 0, label: "Etiqueta", area, variant: "label" },
  { type: "hotspot", id: "custom", from: 0, label: "Custom", area, variant: "Mi Estilo" },
  {
    type: "hotspot",
    id: "tri",
    from: 0,
    label: "Triángulo",
    shape: "polygon",
    points: [
      [0.5, 0.1],
      [0.7, 0.5],
      [0.3, 0.5],
    ],
  },
  {
    type: "hotspot",
    id: "bird",
    from: 0,
    label: "Pájaro",
    keyframes: [
      { at: 0, area: { x: 0, y: 0.5, width: 0.1, height: 0.1 } },
      { at: 4, area: { x: 0.8, y: 0.5, width: 0.1, height: 0.1 }, shape: "ellipse" },
    ],
  },
];

const story: Story = {
  version: "0.1",
  start: "s",
  scenes: { s: { src: "s.mp4", events: hotspots } },
};

function playing(setup?: (player: HTMLElementTagNameMap["ivkit-player"]) => void) {
  const player = document.createElement("ivkit-player");
  setup?.(player);
  document.body.append(player);
  const root = player.shadowRoot!;
  player.story = story;
  player.play();
  const video = root.querySelectorAll("video")[1]!;
  Object.defineProperty(video, "readyState", { value: 4, configurable: true });
  video.dispatchEvent(new Event("loadeddata"));
  player.engine!.update(0);
  const hotspot = (id: string) => root.querySelector<HTMLButtonElement>(`[data-id="${id}"]`)!;
  /** Moves playback to `time` as a seek would, which repositions the hotspots. */
  const seek = (time: number) => {
    video.currentTime = time;
    video.dispatchEvent(new Event("seeked"));
  };
  return { player, hotspot, seek };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("<ivkit-player> hotspot rendering", () => {
  it("exposes the variant as a part and a data attribute, outline by default", () => {
    const { hotspot } = playing();
    expect(hotspot("plain").getAttribute("part")).toBe("hotspot hotspot-outline");
    expect(hotspot("oval").getAttribute("part")).toBe("hotspot hotspot-pulse");
    expect(hotspot("oval").dataset["variant"]).toBe("pulse");
  });

  it("turns custom variant names into valid part names", () => {
    const { hotspot } = playing();
    expect(hotspot("custom").getAttribute("part")).toBe("hotspot hotspot-mi-estilo");
  });

  it("puts the label text inside, shown by the label variant's styles", () => {
    const { hotspot } = playing();
    expect(hotspot("tag").querySelector("[part=hotspot-label]")?.textContent).toBe("Etiqueta");
    expect(hotspot("tag").dataset["variant"]).toBe("label");
  });

  it("draws rects with square corners and ellipses fully rounded", () => {
    const { hotspot } = playing();
    expect(hotspot("plain").querySelector("rect")?.getAttribute("rx")).toBe("0");
    expect(hotspot("oval").querySelector("rect")?.getAttribute("rx")).toBe("50");
    expect(hotspot("oval").style.left).toBe("20%");
    expect(hotspot("oval").style.height).toBe("40%");
  });

  it("sizes polygons to their bounds and draws the points relative to them", () => {
    const { hotspot } = playing();
    const tri = hotspot("tri");
    expect(parseFloat(tri.style.left)).toBeCloseTo(30);
    expect(parseFloat(tri.style.top)).toBeCloseTo(10);
    expect(parseFloat(tri.style.width)).toBeCloseTo(40);
    expect(parseFloat(tri.style.height)).toBeCloseTo(40);

    const points = tri.querySelector("polygon")!.getAttribute("points")!.split(" ");
    expect(points.map((p) => p.split(",").map((n) => Math.round(Number(n))))).toEqual([
      [50, 0],
      [100, 100],
      [0, 100],
    ]);
    expect(tri.querySelector("rect")?.style.display).toBe("none");
  });

  it("moves and reshapes animated hotspots with playback time", () => {
    const { hotspot, seek } = playing();
    const bird = hotspot("bird");
    expect(parseFloat(bird.style.left)).toBeCloseTo(0);
    expect(bird.querySelector("rect")?.getAttribute("rx")).toBe("0");

    seek(2);
    expect(parseFloat(bird.style.left)).toBeCloseTo(40);
    expect(bird.querySelector("rect")?.getAttribute("rx")).toBe("25");

    seek(1);
    expect(parseFloat(bird.style.left)).toBeCloseTo(20);
  });

  it("lets renderHotspot customize each button before it's shown", () => {
    const renderer = vi.fn((hotspot: Hotspot, element: HTMLButtonElement) => {
      element.append(
        Object.assign(document.createElement("img"), { alt: "", src: `${hotspot.id}.svg` }),
      );
    });
    const { hotspot } = playing((player) => {
      player.renderHotspot = renderer;
    });

    expect(renderer).toHaveBeenCalledTimes(hotspots.length);
    expect(renderer.mock.calls[0]![0].id).toBe("plain");
    expect(hotspot("plain").querySelector("img")?.getAttribute("src")).toBe("plain.svg");
  });

  describe("with requestVideoFrameCallback", () => {
    /** Gives both videos a fake frame-callback API; `present(t)` shows a frame at media time t. */
    function withFrameCallbacks() {
      const pending = new Map<HTMLVideoElement, Map<number, VideoFrameRequestCallback>>();
      let next = 1;
      const { player, hotspot } = playing((element) => {
        for (const video of element.shadowRoot!.querySelectorAll("video")) {
          pending.set(video, new Map());
          video.requestVideoFrameCallback = (callback) => {
            pending.get(video)!.set(next, callback);
            return next++;
          };
          video.cancelVideoFrameCallback = (handle) => void pending.get(video)!.delete(handle);
        }
      });
      const front = player.shadowRoot!.querySelector<HTMLVideoElement>("video.front")!;
      const present = (mediaTime: number) => {
        const callbacks = [...pending.get(front)!.values()];
        pending.get(front)!.clear();
        for (const callback of callbacks) {
          callback(0, { mediaTime } as VideoFrameCallbackMetadata);
        }
      };
      return { hotspot, front, present, pending: () => pending.get(front)!.size };
    }

    it("moves animated hotspots to the presented frame's time, not currentTime", () => {
      const { hotspot, front, present } = withFrameCallbacks();
      front.currentTime = 3.9;
      present(2);
      expect(parseFloat(hotspot("bird").style.left)).toBeCloseTo(40);
    });

    it("re-requests exactly one frame callback per frame and ignores timeupdate meanwhile", () => {
      const { hotspot, front, present, pending } = withFrameCallbacks();
      // The MediaController keeps its own callback on the same video for timing.
      const before = pending();
      present(1);
      present(1.5);
      expect(pending()).toBe(before);

      front.currentTime = 3;
      front.dispatchEvent(new Event("timeupdate"));
      // Still where the last presented frame (1.5 s) put it.
      expect(parseFloat(hotspot("bird").style.left)).toBeCloseTo(30);
    });
  });

  it("still activates hotspots through any of their content", () => {
    const { player, hotspot } = playing();
    const onHotspot = vi.fn();
    player.addEventListener("iv-hotspot", onHotspot);
    hotspot("tri")
      .querySelector("polygon")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onHotspot.mock.calls[0]![0].detail.hotspot.id).toBe("tri");
  });
});

describe("<ivkit-player> hotspots coming and going", () => {
  /** "second" and "third" show from 0s, "first" (first in the story) from 2s to 6s. */
  const staggered: Story = {
    version: "0.1",
    start: "s",
    scenes: {
      s: {
        src: "s.mp4",
        events: [
          { type: "hotspot", id: "first", from: 2, to: 6, label: "First", area },
          { type: "hotspot", id: "second", from: 0, to: 4, label: "Second", area },
          { type: "hotspot", id: "third", from: 0, label: "Third", area },
        ],
      },
    },
  };

  function shown() {
    const player = document.createElement("ivkit-player");
    document.body.append(player);
    const renderer = vi.fn();
    player.renderHotspot = renderer;
    player.story = staggered;
    player.play();
    const root = player.shadowRoot!;
    const ids = () =>
      [...root.querySelectorAll<HTMLElement>("[data-id]")].map((b) => b.dataset["id"]);
    const button = (id: string) => root.querySelector<HTMLButtonElement>(`[data-id="${id}"]`)!;
    return { engine: player.engine!, root, renderer, ids, button };
  }

  it("keeps the focused hotspot's button, and its focus, when another one appears", () => {
    const { engine, root, button } = shown();
    engine.update(0);
    const second = button("second");
    second.focus();
    expect(root.activeElement).toBe(second);

    engine.update(2);
    expect(button("second")).toBe(second);
    expect(root.activeElement).toBe(second);
  });

  it("adds new hotspots in story order and removes the ones that leave", () => {
    const { engine, ids } = shown();
    engine.update(0);
    expect(ids()).toEqual(["second", "third"]);
    engine.update(2);
    expect(ids()).toEqual(["first", "second", "third"]);
    engine.update(4);
    expect(ids()).toEqual(["first", "third"]);
    engine.update(6);
    expect(ids()).toEqual(["third"]);
  });

  it("calls renderHotspot once for each hotspot while it stays on screen", () => {
    const { engine, renderer } = shown();
    engine.update(0);
    engine.update(2);
    engine.update(4);
    expect(renderer.mock.calls.map(([hotspot]) => hotspot.id)).toEqual([
      "second",
      "third",
      "first",
    ]);
  });
});
