import type { Story } from "@ivkit/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IvkitPlayer } from "../src/index";

const area = { x: 0.25, y: 0.5, width: 0.1, height: 0.2 };

/** intro: "door" hotspot (1–4s, → hall) and a question at 5s (a → hall, b resumes). */
const story: Story = {
  version: "0.1",
  start: "intro",
  scenes: {
    intro: {
      src: "intro.mp4",
      events: [
        {
          type: "hotspot",
          id: "door",
          from: 1,
          to: 4,
          area,
          label: "Abrir la puerta",
          goto: "hall",
        },
        {
          type: "question",
          id: "q",
          at: 5,
          text: "¿Entras?",
          options: [
            { id: "a", label: "Sí", goto: "hall" },
            { id: "b", label: "No" },
          ],
        },
      ],
    },
    hall: { src: "hall.mp4" },
  },
};

function mount(attributes: Record<string, string> = {}) {
  const player = document.createElement("ivkit-player");
  for (const [name, value] of Object.entries(attributes)) player.setAttribute(name, value);
  document.body.append(player);
  const root = player.shadowRoot!;
  const $ = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const $$ = (selector: string) => [...root.querySelectorAll<HTMLElement>(selector)];
  const videos = $$("video") as HTMLVideoElement[];
  return { player, root, $, $$, videos };
}

/** Pretends `video` decoded its first frame, which lets the controller swap to it. */
function frameReady(video: HTMLVideoElement) {
  Object.defineProperty(video, "readyState", { value: 4, configurable: true });
  video.dispatchEvent(new Event("loadeddata"));
}

/** Mounts, sets the story and plays until the intro is on screen. */
function playing(attributes?: Record<string, string>) {
  const ctx = mount(attributes);
  ctx.player.story = story;
  ctx.$("[part=start-button]").click();
  frameReady(ctx.videos[1]!);
  return ctx;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("<ivkit-player>", () => {
  it("registers the custom element", () => {
    expect(customElements.get("ivkit-player")).toBe(IvkitPlayer);
    expect(document.createElement("ivkit-player")).toBeInstanceOf(IvkitPlayer);
  });

  it("shows the start button once a story is set, and nothing plays before", () => {
    const { player, $ } = mount();
    expect($("[part=start]").hidden).toBe(true);

    player.story = story;
    expect($("[part=start]").hidden).toBe(false);
    expect(player.engine?.state).toBe("idle");
  });

  it("starts on click and reveals the video once its first frame is ready", () => {
    const { player, $, videos } = mount();
    player.story = story;
    $("[part=start-button]").click();

    expect($("[part=start]").hidden).toBe(true);
    expect(videos[1]!.src).toMatch(/intro\.mp4$/);
    expect(videos[1]!.classList.contains("front")).toBe(false);

    frameReady(videos[1]!);
    expect(videos[1]!.classList.contains("front")).toBe(true);
    expect(videos[0]!.classList.contains("front")).toBe(false);
  });

  it("starts right away with autoplay", () => {
    const { player, $ } = mount({ autoplay: "" });
    player.story = story;

    expect($("[part=start]").hidden).toBe(true);
    expect(player.engine?.state).toBe("playing");
  });

  it("applies the muted attribute to both videos", () => {
    const { player, videos } = mount({ muted: "" });
    expect(videos.every((v) => v.muted)).toBe(true);

    player.removeAttribute("muted");
    expect(videos.some((v) => v.muted)).toBe(false);
  });

  it("shows the question with one button per option and focuses the first", () => {
    const { player, root, $, $$ } = playing();
    player.engine!.update(5);

    expect($("[part=question]").hidden).toBe(false);
    expect($("[part=question-text]").textContent).toBe("¿Entras?");
    const options = $$("[part=option]");
    expect(options.map((b) => b.textContent)).toEqual(["Sí", "No"]);
    expect(root.activeElement).toBe(options[0]);
  });

  it("answers on click, hides the question and dispatches iv-answer", () => {
    const { player, $, $$ } = playing();
    const onAnswer = vi.fn();
    document.addEventListener("iv-answer", onAnswer);
    player.engine!.update(5);
    $$("[part=option]")[1]!.click();

    expect($("[part=question]").hidden).toBe(true);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    const event = onAnswer.mock.calls[0]![0] as CustomEvent;
    expect(event.detail.choice.id).toBe("b");
    expect(event.composed).toBe(true);
    document.removeEventListener("iv-answer", onAnswer);
  });

  it("renders visible hotspots as labelled buttons placed in fractions of the picture", () => {
    const { player, $$ } = playing();
    player.engine!.update(2);

    const [door] = $$("[part~=hotspot]");
    expect(door?.getAttribute("aria-label")).toBe("Abrir la puerta");
    expect(door?.style.left).toBe("25%");
    expect(door?.style.top).toBe("50%");
    expect(door?.style.width).toBe("10%");
    expect(door?.style.height).toBe("20%");

    player.engine!.update(4);
    expect($$("[part~=hotspot]")).toHaveLength(0);
  });

  it("activates a hotspot on click and dispatches iv-hotspot", () => {
    const { player, $$ } = playing();
    const onHotspot = vi.fn();
    player.addEventListener("iv-hotspot", onHotspot);
    player.engine!.update(2);
    $$("[part~=hotspot]")[0]!.click();

    expect(onHotspot.mock.calls[0]![0].detail.hotspot.id).toBe("door");
    expect(player.engine!.currentSceneId).toBe("hall");
  });

  it("dispatches iv-scene and iv-interaction", () => {
    const { player } = mount();
    const types: string[] = [];
    for (const type of ["iv-scene", "iv-interaction", "iv-end"] as const) {
      player.addEventListener(type, () => types.push(type));
    }
    player.story = story;
    player.play();
    player.engine!.update(5);

    expect(types).toEqual(["iv-scene", "iv-interaction"]);
  });

  it("shows the end overlay when the story ends and restarts from replay", () => {
    const { player, $, videos } = playing();
    const onEnd = vi.fn();
    player.addEventListener("iv-end", onEnd);
    player.engine!.update(5);
    $("[part=option]").click();
    frameReady(videos[0]!);
    videos[0]!.dispatchEvent(new Event("ended"));

    expect(onEnd).toHaveBeenCalledTimes(1);
    expect($("[part=end]").hidden).toBe(false);

    $("[part=replay-button]").click();
    expect($("[part=end]").hidden).toBe(true);
    expect(player.engine!.currentSceneId).toBe("intro");
  });

  it("hides a showing question when the story restarts", () => {
    const { player, $ } = playing();
    player.engine!.update(5);
    player.restart();

    expect(player.engine!.state).toBe("playing");
    expect($("[part=question]").hidden).toBe(true);
  });

  it("goes to a scene before playing, hiding the start button", () => {
    const { player, $, videos } = mount();
    const onScene = vi.fn();
    player.addEventListener("iv-scene", onScene);
    player.story = story;
    player.goTo("hall");

    expect($("[part=start]").hidden).toBe(true);
    expect(player.engine!.currentSceneId).toBe("hall");
    expect(onScene.mock.calls[0]![0].detail.sceneId).toBe("hall");
    expect(videos[1]!.src).toContain("hall.mp4");
  });

  it("dismisses the question and hotspots when going to another scene", () => {
    const { player, $, $$ } = playing();
    player.engine!.update(2);
    expect($$("[part~=hotspot]")).toHaveLength(1);
    player.engine!.update(5);
    player.goTo("hall");

    expect($("[part=question]").hidden).toBe(true);
    expect($$("[part~=hotspot]")).toHaveLength(0);
    expect(player.engine!.currentSceneId).toBe("hall");
  });

  it("goes to a scene from the end overlay", () => {
    const { player, $, videos } = playing();
    player.engine!.update(5);
    $("[part=option]").click();
    frameReady(videos[0]!);
    videos[0]!.dispatchEvent(new Event("ended"));
    player.goTo("intro");

    expect($("[part=end]").hidden).toBe(true);
    expect(player.engine!.state).toBe("playing");
  });

  it("ignores goTo() without a story", () => {
    const { player } = mount();
    expect(() => player.goTo("hall")).not.toThrow();
  });

  it("shows the start button again when autoplay is blocked", async () => {
    const { player, $, videos } = mount();
    player.story = story;
    for (const video of videos) {
      video.play = () => Promise.reject(new DOMException("blocked", "NotAllowedError"));
    }
    $("[part=start-button]").click();
    frameReady(videos[1]!);
    await vi.waitFor(() => expect($("[part=start]").hidden).toBe(false));
  });

  it("resets everything when a new story is set", () => {
    const { player, $, $$, videos } = playing();
    const first = player.engine;
    player.engine!.update(5);

    player.story = { ...story, start: "hall" };
    expect(player.engine).not.toBe(first);
    expect(player.engine?.state).toBe("idle");
    expect($("[part=question]").hidden).toBe(true);
    expect($$("[part~=hotspot]")).toHaveLength(0);
    expect(videos.some((v) => v.classList.contains("front"))).toBe(false);

    // The old engine no longer drives the UI.
    first!.answer("a");
    expect($("[part=question]").hidden).toBe(true);
  });
});
