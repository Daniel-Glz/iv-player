import "@iv-player/player";
import { story } from "./story";

const player = document.querySelector("iv-player");
const log = document.querySelector<HTMLOListElement>("#log");
if (!player || !log) throw new Error("Demo markup is missing <iv-player> or #log");

function append(type: string, text: string) {
  const item = document.createElement("li");
  const time = new Date().toLocaleTimeString([], { hour12: false });
  item.innerHTML = `<time>${time}</time> <code></code> <span></span>`;
  item.querySelector("code")!.textContent = type;
  item.querySelector("span")!.textContent = text;
  log!.prepend(item);
}

player.addEventListener("iv-scene", (e) => append("iv-scene", e.detail.sceneId));
player.addEventListener("iv-interaction", (e) => append("iv-interaction", e.detail.question.text));
player.addEventListener("iv-answer", (e) => append("iv-answer", e.detail.choice.label));
player.addEventListener("iv-hotspot", (e) => append("iv-hotspot", e.detail.hotspot.label));
player.addEventListener("iv-end", (e) => append("iv-end", e.detail.sceneId));

player.story = story;

document.querySelector("#restart")?.addEventListener("click", () => player.restart());
document.querySelector("#theme")?.addEventListener("click", () => {
  document.body.classList.toggle("custom-theme");
});
