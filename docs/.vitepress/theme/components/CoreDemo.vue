<script setup lang="ts">
// A player built from @iv-player/core alone: two stacked videos, the engine,
// the media controller, and an interface of our own drawn with Vue.
import { MediaController, StoryEngine, type Question, type Story } from "@iv-player/core";
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue";

const props = defineProps<{ story: Story }>();

const videoA = ref<HTMLVideoElement>();
const videoB = ref<HTMLVideoElement>();
const front = shallowRef<HTMLVideoElement>();
const question = shallowRef<Question | null>(null);
const scene = ref("");
const state = ref<"ready" | "playing" | "ended">("ready");
const visited = ref<string[]>([]);

let engine: StoryEngine | null = null;
let controller: MediaController<HTMLVideoElement> | null = null;

onMounted(() => {
  engine = new StoryEngine(props.story);
  // Create the controller before engine.start(), so it sees the first scene.
  controller = new MediaController(engine, [videoA.value!, videoB.value!]);

  controller.on("swap", ({ active }) => (front.value = active));
  controller.on("blocked", () => (state.value = "ready"));
  engine.on("scene", ({ sceneId }) => {
    scene.value = sceneId;
    visited.value = [...visited.value, sceneId];
  });
  engine.on("interaction", ({ question: q }) => (question.value = q));
  engine.on("answer", () => (question.value = null));
  engine.on("end", () => (state.value = "ended"));
});

onBeforeUnmount(() => controller?.destroy());

function start() {
  if (!engine || !controller) return;
  visited.value = [];
  if (engine.state === "idle" || engine.state === "ended") engine.start();
  else controller.play();
  state.value = "playing";
}

const answer = (choiceId: string) => engine?.answer(choiceId);
</script>

<template>
  <div class="core-demo">
    <div class="screen">
      <video ref="videoA" :class="{ front: front === videoA }" playsinline muted />
      <video ref="videoB" :class="{ front: front === videoB }" playsinline muted />

      <div v-if="question" class="cards">
        <p class="prompt">{{ question.text }}</p>
        <button v-for="option in question.options" :key="option.id" class="card" @click="answer(option.id)">
          <span class="card-title">{{ option.label }}</span>
          <span class="card-goto">→ {{ option.goto ?? "continue" }}</span>
        </button>
      </div>

      <button v-if="state !== 'playing'" class="start" @click="start">
        {{ state === "ended" ? "↻ Play again" : "▶ Start" }}
      </button>
    </div>

    <ol class="trail" aria-label="Scenes visited">
      <li v-for="(id, i) in visited" :key="i" :class="{ current: i === visited.length - 1 }">{{ id }}</li>
      <li v-if="visited.length === 0" class="empty">The scenes you visit will show up here.</li>
    </ol>
  </div>
</template>

<style scoped>
.core-demo {
  margin: 24px 0;
}

.screen {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 12px;
  background: #000;
}

/* Both stay rendered, so the hidden one decodes its first frame before the swap. */
video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
}

video.front {
  opacity: 1;
}

.cards {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: end;
  padding: 16px;
  background: linear-gradient(transparent, rgb(0 0 0 / 0.75));
}

.prompt {
  flex-basis: 100%;
  margin: 0;
  color: #fff;
  font-weight: 600;
}

.card {
  display: flex;
  flex: 1 1 140px;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid rgb(255 255 255 / 0.25);
  border-radius: 10px;
  background: rgb(255 255 255 / 0.12);
  color: #fff;
  text-align: left;
  backdrop-filter: blur(6px);
  transition: background 0.15s, transform 0.15s;
}

.card:hover,
.card:focus-visible {
  background: rgb(255 255 255 / 0.25);
  transform: translateY(-2px);
}

.card-title {
  font-weight: 600;
}

.card-goto {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  opacity: 0.7;
}

.start {
  position: absolute;
  inset: 50% auto auto 50%;
  translate: -50% -50%;
  padding: 10px 22px;
  border-radius: 999px;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  font-weight: 600;
}

.trail {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.trail li {
  margin: 0;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
}

.trail li.current {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.trail .empty {
  background: none;
  color: var(--vp-c-text-3);
}
</style>
