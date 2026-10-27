import type { Story } from "@ivkit/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/index";

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
          text: "¿Seguimos?",
          options: [{ id: "ok", label: "Sí" }],
        },
      ],
    },
  },
};

/** Mounts a player with `controls` and plays until the intro is on screen. */
function playing(attributes: Record<string, string> = { controls: "" }) {
  const player = document.createElement("ivkit-player");
  for (const [name, value] of Object.entries(attributes)) player.setAttribute(name, value);
  document.body.append(player);
  const root = player.shadowRoot!;
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
    root.querySelector<T>(selector)!;
  const videos = [...root.querySelectorAll("video")];
  player.story = story;
  player.play();
  const intro = videos[1]!;
  Object.defineProperty(intro, "readyState", { value: 4, configurable: true });
  Object.defineProperty(intro, "duration", { value: 20, configurable: true });
  intro.dispatchEvent(new Event("loadeddata"));
  return { player, $, videos, intro };
}

function press(player: HTMLElement, key: string) {
  player.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }));
}

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  document.documentElement.style.overflow = "";
});

describe("<ivkit-player> controls", () => {
  it("only shows the control bar with the controls attribute", () => {
    const { player, $ } = playing({});
    expect($("[part=controls]").hidden).toBe(true);

    player.setAttribute("controls", "");
    expect($("[part=controls]").hidden).toBe(false);
  });

  it("hides the control bar over the start screen, questions and the end", () => {
    const player = document.createElement("ivkit-player");
    player.setAttribute("controls", "");
    document.body.append(player);
    const controls = player.shadowRoot!.querySelector<HTMLElement>("[part=controls]")!;
    player.story = story;
    expect(controls.hidden).toBe(true);

    player.play();
    expect(controls.hidden).toBe(false);

    player.engine!.update(5);
    expect(controls.hidden).toBe(true);
    player.engine!.answer("ok");
    expect(controls.hidden).toBe(false);

    player.engine!.mediaEnded();
    expect(controls.hidden).toBe(true);
  });

  it("disables picture-in-picture on both videos", () => {
    const { videos } = playing();
    expect(videos.every((v) => v.hasAttribute("disablepictureinpicture"))).toBe(true);
  });

  it("toggles play and pause on the active video, updating the button", () => {
    const { $, intro } = playing();
    const button = $("[part~=play-button]");
    expect(intro.paused).toBe(false);
    expect(button.getAttribute("aria-label")).toBe("Pause");

    button.click();
    expect(intro.paused).toBe(true);
    expect(button.getAttribute("aria-label")).toBe("Play");

    button.click();
    expect(intro.paused).toBe(false);
  });

  it("seeks within the current scene from the progress bar", () => {
    const { $, intro } = playing();
    const progress = $<HTMLInputElement>("[part=progress]");
    progress.value = "3.5";
    progress.dispatchEvent(new Event("input"));

    expect(intro.currentTime).toBe(3.5);
  });

  it("doesn't seek while a question is showing", () => {
    const { player, intro } = playing();
    intro.currentTime = 5;
    player.engine!.update(5);
    press(player, "ArrowRight");

    expect(intro.currentTime).toBe(5);
  });

  it("mutes through the muted attribute and sets the volume of both videos", () => {
    const { player, $, videos } = playing();
    $("[part~=mute-button]").click();
    expect(player.hasAttribute("muted")).toBe(true);
    expect(videos.every((v) => v.muted)).toBe(true);

    const volume = $<HTMLInputElement>("[part=volume]");
    volume.value = "0.4";
    volume.dispatchEvent(new Event("input"));
    expect(videos.every((v) => v.volume === 0.4)).toBe(true);
    expect(player.hasAttribute("muted")).toBe(false);
  });

  it("supports keyboard shortcuts and makes itself focusable for them", () => {
    const { player, intro } = playing();
    expect(player.tabIndex).toBe(0);

    press(player, " ");
    expect(intro.paused).toBe(true);
    press(player, "k");
    expect(intro.paused).toBe(false);

    press(player, "m");
    expect(player.hasAttribute("muted")).toBe(true);

    intro.currentTime = 2;
    press(player, "ArrowRight");
    expect(intro.currentTime).toBe(7);
    press(player, "ArrowLeft");
    expect(intro.currentTime).toBe(2);
  });

  it("keeps a page-provided tabindex", () => {
    const { player } = playing({ controls: "", tabindex: "-1" });
    expect(player.tabIndex).toBe(-1);
  });

  it("falls back to covering the viewport where element fullscreen isn't available", () => {
    const { player, $ } = playing();
    const button = $("[part~=fullscreen-button]");
    button.click();

    expect(player.hasAttribute("pseudo-fullscreen")).toBe(true);
    expect(player.isFullscreen).toBe(true);
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(button.getAttribute("aria-label")).toBe("Exit full screen");

    press(player, "Escape");
    expect(player.hasAttribute("pseudo-fullscreen")).toBe(false);
    expect(document.documentElement.style.overflow).toBe("");
    expect(button.getAttribute("aria-label")).toBe("Full screen");
  });

  it("uses the Fullscreen API on the player itself when available", () => {
    const { player, $ } = playing();
    // happy-dom has no Fullscreen API: provide the pieces the player checks.
    Object.defineProperty(document, "fullscreenEnabled", { value: true, configurable: true });
    const request = vi.fn(() => Promise.resolve());
    player.requestFullscreen = request;
    $("[part~=fullscreen-button]").click();
    delete (document as { fullscreenEnabled?: boolean }).fullscreenEnabled;

    expect(request).toHaveBeenCalledOnce();
    expect(player.hasAttribute("pseudo-fullscreen")).toBe(false);
  });

  it("fades the controls out after 3s without activity while playing", () => {
    vi.useFakeTimers();
    const { $ } = playing();
    const stage = $("[part=stage]");
    stage.dispatchEvent(new Event("pointermove"));
    vi.advanceTimersByTime(2999);
    expect(stage.classList.contains("idle")).toBe(false);

    vi.advanceTimersByTime(1);
    expect(stage.classList.contains("idle")).toBe(true);

    stage.dispatchEvent(new Event("pointermove"));
    expect(stage.classList.contains("idle")).toBe(false);
  });

  it("keeps the controls visible while paused", () => {
    vi.useFakeTimers();
    const { player, $ } = playing();
    player.pause();
    $("[part=stage]").dispatchEvent(new Event("pointermove"));
    vi.advanceTimersByTime(5000);

    expect($("[part=stage]").classList.contains("idle")).toBe(false);
  });
});
