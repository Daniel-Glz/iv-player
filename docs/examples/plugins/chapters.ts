import type { Cue, CueCheck, SceneId } from "@ivkit/core";
import type { PlayerPlugin } from "@ivkit/player";

/** Rejects chapter cues without a title, when the story is validated. */
export const checkChapter: CueCheck = (cue, report) => {
  const title = (cue["data"] as { title?: unknown } | undefined)?.title;
  if (typeof title !== "string" || title === "") {
    report("/data/title", "A chapter needs a title.");
  }
};

const css = /* css */ `
.chapters {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  right: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
.chapters button {
  pointer-events: auto;
  padding: 0.25rem 0.625rem;
  border: 0;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.55);
  color: #fff;
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}
.chapters button[aria-current="true"] {
  background: #fff;
  color: #000;
}
`;

/**
 * Shows every chapter cue of the story as a button, highlights the active one and
 * jumps to a chapter on click, in its own scene or in another one.
 */
export const chapters: PlayerPlugin = ({ player, engine, media, layer, on }) => {
  const list = Object.entries(engine.story.scenes).flatMap(([sceneId, scene]) =>
    (scene.events ?? [])
      .filter((event): event is Cue => event.type === "cue" && event.kind === "chapter")
      .map((cue) => ({ sceneId, cue })),
  );
  if (list.length === 0) return;

  const style = document.createElement("style");
  style.textContent = css;
  const nav = document.createElement("nav");
  nav.className = "chapters";
  nav.setAttribute("part", "chapters");
  nav.setAttribute("aria-label", "Chapters");
  const buttons = list.map(({ sceneId, cue }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("part", "chapter");
    button.textContent = String(cue.data?.["title"]);
    button.addEventListener("click", () => jump(sceneId, cue.from));
    return button;
  });
  nav.append(...buttons);
  layer.append(style, nav);

  // A chapter in another scene starts once that scene's video is on screen.
  let pending: number | null = null;
  const jump = (sceneId: SceneId, time: number) => {
    if (sceneId === engine.currentSceneId && engine.state !== "ended") {
      media.active.currentTime = time;
      player.play();
    } else {
      pending = time;
      player.goTo(sceneId);
    }
  };
  const off = media.on("swap", ({ active }) => {
    if (pending !== null && pending > 0) active.currentTime = pending;
    pending = null;
  });

  on("cues", ({ cues }) => {
    list.forEach(({ cue }, i) => {
      buttons[i]?.setAttribute("aria-current", String(cues.includes(cue)));
    });
  });
  return off;
};
