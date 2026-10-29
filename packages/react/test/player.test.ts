import type { Story } from "@ivkit/core";
import { createElement, StrictMode, type ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IvkitPlayer, type IvkitPlayerElement, type IvkitPlayerProps } from "../src/index";

// Tells React the tests wrap updates in act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** intro: a "door" hotspot (1–4s, → hall). */
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
          area: { x: 0.25, y: 0.5, width: 0.1, height: 0.2 },
          label: "Open the door",
          goto: "hall",
        },
      ],
    },
    hall: { src: "hall.mp4" },
  },
};

let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.replaceChildren();
});

/** Renders `<IvkitPlayer {...props}>` (again, on later calls) and returns the element. */
function render(props: IvkitPlayerProps & { ref?: (player: IvkitPlayerElement | null) => void }) {
  return renderNode(createElement(IvkitPlayer, props));
}

function renderNode(node: ReactNode) {
  if (!root) {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  }
  act(() => root!.render(node));
  return document.querySelector("ivkit-player")!;
}

describe("<IvkitPlayer>", () => {
  it("sets the story as a property and booleans as empty attributes", () => {
    const player = render({ story, controls: true, muted: true, className: "hero", id: "p" });
    expect(player.story).toBe(story);
    expect(player.getAttribute("controls")).toBe("");
    expect(player.getAttribute("muted")).toBe("");
    expect(player.hasAttribute("autoplay")).toBe(false);
    expect(player.hasAttribute("story")).toBe(false);
    expect(player.className).toBe("hero");
    expect(player.id).toBe("p");
  });

  it("removes a boolean attribute set to false", () => {
    const player = render({ controls: true });
    render({ controls: false });
    expect(player.hasAttribute("controls")).toBe(false);
  });

  it("forwards its ref to the element", () => {
    let element: IvkitPlayerElement | null = null;
    const player = render({ story, ref: (value) => (element = value) });
    expect(element).toBe(player);
  });

  it("renders children into the element, for its slots", () => {
    const player = renderNode(
      createElement(IvkitPlayer, { story }, createElement("p", { slot: "end" }, "The end")),
    );
    expect(player.querySelector("[slot=end]")?.textContent).toBe("The end");
  });

  it("resets the player only when the story changes", () => {
    const player = render({ story });
    const engine = player.engine;
    render({ story, controls: true });
    expect(player.engine).toBe(engine);
    const other = { ...story };
    render({ story: other });
    expect(player.story).toBe(other);
    expect(player.engine).not.toBe(engine);
    render({});
    expect(player.story).toBeNull();
  });

  it("calls the latest event callback with the event", () => {
    const first = vi.fn();
    const player = render({ story, onScene: first });
    player.play();
    expect(first).toHaveBeenCalledTimes(1);
    expect(first.mock.calls[0]![0].detail.sceneId).toBe("intro");

    const second = vi.fn();
    render({ story, onScene: second });
    player.goTo("hall");
    expect(first).toHaveBeenCalledTimes(1);
    expect(second.mock.calls[0]![0].detail.sceneId).toBe("hall");
  });

  it("doesn't pass onError to the element as a native error listener", () => {
    const onError = vi.fn();
    const player = render({ story, onError });
    player.dispatchEvent(new Event("error"));
    expect(onError).not.toHaveBeenCalled();
    const detail = { sceneId: "intro", error: null };
    player.dispatchEvent(new CustomEvent("iv-error", { detail }));
    expect(onError.mock.calls[0]![0].detail).toBe(detail);
  });

  it("has its callbacks before the story is set, for events it emits right away", () => {
    const onScene = vi.fn();
    render({ story, autoplay: true, onScene });
    expect(onScene).toHaveBeenCalledTimes(1);
  });

  it("sets renderHotspot before the story", () => {
    const renderHotspot = vi.fn();
    const player = render({ story, renderHotspot });
    expect(player.renderHotspot).toBe(renderHotspot);
    render({ story });
    expect(player.renderHotspot).toBeNull();
  });

  it("adds each plugin once and removes the ones that leave", () => {
    const cleanupA = vi.fn();
    const a = vi.fn(() => cleanupA);
    const b = vi.fn();
    const player = render({ story, plugins: [a] });
    expect(a).toHaveBeenCalledTimes(1);
    expect(a.mock.calls[0]).toMatchObject([{ player }]);

    render({ story, plugins: [a, b] });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    render({ story, plugins: [b] });
    expect(cleanupA).toHaveBeenCalledTimes(1);
    const layers = () => player.shadowRoot!.querySelectorAll("[part=plugin]");
    expect(layers()).toHaveLength(1);

    act(() => root!.unmount());
    root = null;
    expect(layers()).toHaveLength(0);
  });

  it("runs plugins for a story set in the same render", () => {
    const plugin = vi.fn();
    render({ plugins: [plugin] });
    expect(plugin).not.toHaveBeenCalled();
    render({ story, plugins: [plugin] });
    expect(plugin).toHaveBeenCalledTimes(1);
  });

  it("ends up with one run of each plugin and the story set in Strict Mode", () => {
    const plugin = vi.fn();
    const onScene = vi.fn();
    const player = renderNode(
      createElement(
        StrictMode,
        null,
        createElement(IvkitPlayer, { story, plugins: [plugin], onScene }),
      ),
    );
    expect(player.story).toBe(story);
    expect(player.shadowRoot!.querySelectorAll("[part=plugin]")).toHaveLength(1);
    player.play();
    expect(onScene).toHaveBeenCalledTimes(1);
  });

  it("renders the tag and its attributes on the server", () => {
    const html = renderToString(
      createElement(IvkitPlayer, { story, controls: true, muted: false }),
    );
    expect(html).toBe('<ivkit-player controls=""></ivkit-player>');
  });
});
