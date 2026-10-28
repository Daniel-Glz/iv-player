<script setup lang="ts">
import type { Story } from "@ivkit/core";
import type { IvkitPlayer } from "@ivkit/player";
import { computed, onMounted, ref } from "vue";

export interface Lesson {
  /** What each hotspot teaches, by hotspot id. */
  facts: Record<string, { title: string; text: string }>;
  /** Id of the right choice of each question, by question id. */
  answers: Record<string, string>;
}

const props = defineProps<{ story: Story; lesson: Lesson }>();

const player = ref<IvkitPlayer>();
const found = ref(new Set<string>());
const right = ref(new Set<string>());
const answered = ref(new Set<string>());
const fact = ref<string | null>(null);
const ended = ref(false);

const facts = computed(() => Object.entries(props.lesson.facts));
const questions = computed(() => Object.keys(props.lesson.answers).length);

/** Hotspots already shown in the current visit to a scene. */
let shown = new Set<string>();

/** Pauses on a part, so it stays in view while the viewer reads about it. */
function showFact(id: string) {
  if (!(id in props.lesson.facts)) return;
  player.value!.pause();
  fact.value = id;
  found.value = new Set(found.value).add(id);
}

/** Sets the story, which resets the player to its start screen and creates a new engine. */
function load() {
  const element = player.value!;
  element.story = props.story;
  // The engine reports every change to the hotspots on screen: stop on each new one.
  element.engine!.on("hotspots", ({ hotspots }) => {
    const appeared = hotspots.find((hotspot) => !shown.has(hotspot.id));
    for (const hotspot of hotspots) shown.add(hotspot.id);
    if (appeared) showFact(appeared.id);
  });
}

function restart() {
  found.value = new Set();
  right.value = new Set();
  answered.value = new Set();
  fact.value = null;
  ended.value = false;
  load();
}

function resume() {
  fact.value = null;
  player.value!.play();
}

onMounted(async () => {
  // Custom elements only exist in the browser, not during the static build.
  await import("@ivkit/player");
  const element = player.value!;
  // Clicking a part shows its fact again.
  element.addEventListener("iv-hotspot", (event) => showFact(event.detail.hotspot.id));
  element.addEventListener("iv-answer", (event) => {
    const { question, choice } = event.detail;
    // Only the first answer counts towards the score.
    if (answered.value.has(question.id)) return;
    answered.value = new Set(answered.value).add(question.id);
    if (props.lesson.answers[question.id] === choice.id) {
      right.value = new Set(right.value).add(question.id);
    }
  });
  element.addEventListener("iv-scene", () => {
    fact.value = null;
    shown = new Set();
  });
  element.addEventListener("iv-end", () => {
    ended.value = true;
  });
  load();
});
</script>

<template>
  <div class="lesson">
    <ivkit-player ref="player" controls />

    <div class="lesson-panel">
      <div class="lesson-progress">
        <span class="lesson-label">Parts</span>
        <span
          v-for="[id, { title }] in facts"
          :key="id"
          class="lesson-chip"
          :class="{ found: found.has(id) }"
          >{{ found.has(id) ? title : "?" }}</span
        >
        <span class="lesson-score">Quiz {{ right.size }}/{{ questions }}</span>
      </div>

      <div v-if="fact" class="lesson-card" aria-live="polite">
        <strong>{{ lesson.facts[fact].title }}</strong>
        <p>{{ lesson.facts[fact].text }}</p>
        <button type="button" @click="resume">Keep watching</button>
      </div>
      <div v-else-if="ended" class="lesson-card" aria-live="polite">
        <strong>Lesson complete</strong>
        <p>
          You saw {{ found.size }} of {{ facts.length }} parts and got {{ right.size }} of
          {{ questions }} questions right on the first try.
        </p>
        <button type="button" @click="restart">Watch again</button>
      </div>
      <p v-else class="lesson-hint">
        The video stops on each part of the rocket as it lights up. Click a part to read about it
        again.
      </p>
    </div>
  </div>
</template>

<style scoped>
.lesson {
  margin: 24px 0;
}

ivkit-player {
  border-radius: 12px;
  /* Cyan stands out against both the night sky and the white exhaust. */
  --iv-hotspot-stroke: #5ee7ff;
  --iv-hotspot-fill: rgb(94 231 255 / 0.15);
  --iv-hotspot-fill-hover: rgb(94 231 255 / 0.35);
}

.lesson-panel {
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  font-size: 14px;
}

.lesson-progress {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.lesson-label {
  color: var(--vp-c-text-2);
  font-weight: 600;
}

.lesson-chip {
  min-width: 28px;
  padding: 1px 10px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 999px;
  color: var(--vp-c-text-3);
  text-align: center;
}

.lesson-chip.found {
  border: 1px solid var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.lesson-score {
  margin-left: auto;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
}

.lesson-card {
  margin-top: 12px;
}

.lesson-card p {
  margin: 4px 0 10px;
  line-height: 1.6;
}

.lesson-card button {
  padding: 4px 14px;
  border-radius: 6px;
  background: var(--vp-c-brand-3);
  color: var(--vp-c-white);
  font-weight: 500;
}

.lesson-card button:hover {
  background: var(--vp-c-brand-2);
}

.lesson-hint {
  margin: 10px 0 0;
  color: var(--vp-c-text-3);
}
</style>
