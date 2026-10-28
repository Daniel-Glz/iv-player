<script setup lang="ts">
// A vertical, stories-style player built from @ivkit/core alone: a progress bar
// per scene, tap to go back or skip, and hold to pause.
import { MediaController, StoryEngine, type Story } from "@ivkit/core";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";

const props = defineProps<{
  story: Story;
  captions: Record<string, { place: string; text: string }>;
}>();

const videoA = ref<HTMLVideoElement>();
const videoB = ref<HTMLVideoElement>();
const front = shallowRef<HTMLVideoElement>();
const state = ref<"ready" | "playing" | "ended">("ready");
const held = ref(false);
/** Index of the playing scene in `scenes`. */
const current = ref(0);
/** How far the current scene has played, from 0 to 1. */
const progress = ref(0);

/** The scenes in order, following each one's `next` from the start. */
const scenes = computed(() => {
  const order: string[] = [];
  for (let id: string | undefined = props.story.start; id && !order.includes(id); ) {
    order.push(id);
    id = props.story.scenes[id].next;
  }
  return order;
});
const caption = computed(() => props.captions[scenes.value[current.value]]);

let engine: StoryEngine | null = null;
let controller: MediaController<HTMLVideoElement> | null = null;
let frame = 0;
let holdTimer = 0;

onMounted(() => {
  engine = new StoryEngine(props.story);
  // Create the controller before engine.start(), so it sees the first scene.
  controller = new MediaController(engine, [videoA.value!, videoB.value!]);

  controller.on("swap", ({ active }) => (front.value = active));
  controller.on("blocked", () => (state.value = "ready"));
  engine.on("scene", ({ sceneId }) => {
    current.value = scenes.value.indexOf(sceneId);
    progress.value = 0;
  });
  engine.on("end", () => {
    progress.value = 1;
    state.value = "ended";
  });

  const tick = () => {
    const media = controller?.active;
    if (media?.duration && state.value !== "ended") progress.value = media.currentTime / media.duration;
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  controller?.destroy();
});

function start() {
  if (!engine || !controller) return;
  if (engine.state === "idle" || engine.state === "ended") engine.start();
  else controller.play();
  state.value = "playing";
}

/** Restarts the scene, or goes back to the previous one if this one just started. */
function back() {
  const media = controller?.active;
  if (!engine || !media) return;
  const restart = media.currentTime > 1.5 || current.value === 0;
  engine.goTo(scenes.value[restart ? current.value : current.value - 1]);
}

/** Jumps to the end of the scene, so the engine moves on to its `next`. */
function skip() {
  const media = controller?.active;
  if (media?.duration) media.currentTime = media.duration - 0.05;
}

// A quick tap navigates. Holding pauses until the finger lifts, like stories do.
function press() {
  holdTimer = window.setTimeout(() => {
    held.value = true;
    controller?.pause();
  }, 200);
}

function release(action: () => void) {
  clearTimeout(holdTimer);
  if (held.value) {
    held.value = false;
    controller?.play();
  } else action();
}

function onKey(event: KeyboardEvent) {
  if (state.value !== "playing") return;
  if (event.key === "ArrowLeft") back();
  else if (event.key === "ArrowRight") skip();
  else return;
  event.preventDefault();
}
</script>

<template>
  <div class="stories-demo">
    <div class="phone" :class="{ held }" tabindex="0" @keydown="onKey">
      <video ref="videoA" :class="{ front: front === videoA }" playsinline muted />
      <video ref="videoB" :class="{ front: front === videoB }" playsinline muted />

      <div class="top">
        <div class="bars">
          <span v-for="(id, i) in scenes" :key="id" class="bar">
            <span
              class="fill"
              :style="{ transform: `scaleX(${i < current ? 1 : i === current ? progress : 0})` }"
            />
          </span>
        </div>
        <p v-if="caption" class="place">{{ caption.place }}</p>
      </div>

      <template v-if="state === 'playing'">
        <button
          class="zone back"
          type="button"
          aria-label="Previous"
          @pointerdown="press"
          @pointerup="release(back)"
          @pointerleave="held && release(() => {})"
        />
        <button
          class="zone skip"
          type="button"
          aria-label="Next"
          @pointerdown="press"
          @pointerup="release(skip)"
          @pointerleave="held && release(() => {})"
        />
      </template>

      <div class="bottom">
        <p v-if="caption && state === 'playing'" class="caption">{{ caption.text }}</p>
      </div>

      <button v-if="state !== 'playing'" class="start" type="button" @click="start">
        {{ state === "ended" ? "↻ Watch again" : "▶ Tap to start" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.stories-demo {
  display: flex;
  justify-content: center;
  margin: 24px 0;
}

.phone {
  position: relative;
  width: min(100%, 340px);
  aspect-ratio: 9 / 16;
  overflow: hidden;
  border-radius: 20px;
  background: #000;
  color: #fff;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

.phone:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}

/* Both stay rendered, so the hidden one decodes its first frame before the swap. */
video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
}

video.front {
  opacity: 1;
}

.top {
  position: absolute;
  inset: 0 0 auto;
  z-index: 2;
  padding: 10px 12px 28px;
  background: linear-gradient(rgb(0 0 0 / 0.55), transparent);
  pointer-events: none;
  transition: opacity 0.2s;
}

.bars {
  display: flex;
  gap: 4px;
}

.bar {
  flex: 1;
  height: 3px;
  overflow: hidden;
  border-radius: 2px;
  background: rgb(255 255 255 / 0.35);
}

.fill {
  display: block;
  height: 100%;
  background: #fff;
  transform-origin: left;
}

.place {
  margin: 10px 0 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.5);
}

/* While held, the overlays fade so the picture shows, as in stories apps. */
.held .top,
.held .bottom {
  opacity: 0;
}

.zone {
  position: absolute;
  inset-block: 0;
  z-index: 1;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.zone.back {
  left: 0;
  width: 33%;
}

.zone.skip {
  right: 0;
  width: 67%;
}

.bottom {
  position: absolute;
  inset: auto 0 0;
  z-index: 2;
  padding: 48px 16px 20px;
  background: linear-gradient(transparent, rgb(0 0 0 / 0.7));
  pointer-events: none;
  transition: opacity 0.2s;
}

.caption {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  text-shadow: 0 1px 3px rgb(0 0 0 / 0.6);
}

.start {
  position: absolute;
  inset: 50% auto auto 50%;
  z-index: 3;
  translate: -50% -50%;
  padding: 10px 22px;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.9);
  color: #000;
  font-weight: 600;
  white-space: nowrap;
}
</style>
