<script setup lang="ts">
import type { Story } from "@ivkit/core";
import type { IvkitPlayer } from "@ivkit/player";
import { onMounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    story: Story;
    controls?: boolean;
    renderHotspot?: IvkitPlayer["renderHotspot"];
    /** Shows the player's events under it. */
    log?: boolean;
  }>(),
  { controls: true, log: false },
);

const player = ref<IvkitPlayer>();
const entries = ref<string[]>([]);

const describe: Record<string, (detail: any) => string> = {
  "iv-scene": (d) => `scene → ${d.sceneId}`,
  "iv-interaction": (d) => `question "${d.question.id}" at ${d.question.at}s`,
  "iv-timeout": (d) => `timeout on "${d.question.id}"`,
  "iv-answer": (d) =>
    `answer ${d.choices.map((c: { id: string }) => `"${c.id}"`).join(", ")}` +
    `${d.correct === undefined ? "" : d.correct ? " ✓" : " ✗"}${d.goto ? ` → ${d.goto}` : ""}`,
  "iv-hotspot": (d) => `hotspot "${d.hotspot.id}"${d.goto ? ` → ${d.goto}` : ""}`,
  "iv-end": (d) => `end on ${d.sceneId}`,
};

onMounted(async () => {
  // Custom elements only exist in the browser, not during the static build.
  await import("@ivkit/player");
  const element = player.value!;
  if (props.log) {
    for (const [type, text] of Object.entries(describe)) {
      element.addEventListener(type, (event) => {
        // Stories with variables show them after each event.
        const vars = Object.entries(element.engine?.vars ?? {});
        const suffix = vars.length ? `  {${vars.map(([k, v]) => ` ${k}: ${v}`).join(",")} }` : "";
        entries.value = [text((event as CustomEvent).detail) + suffix, ...entries.value].slice(0, 6);
      });
    }
  }
  element.renderHotspot = props.renderHotspot ?? null;
  element.story = props.story;
});
</script>

<template>
  <div class="player-demo">
    <ivkit-player ref="player" :controls="controls || undefined">
      <slot />
    </ivkit-player>
    <ol v-if="log" class="player-demo-log" aria-live="polite">
      <li v-if="entries.length === 0" class="empty">Events will show up here.</li>
      <li v-for="(entry, i) in entries" :key="entries.length - i">{{ entry }}</li>
    </ol>
  </div>
</template>

<style scoped>
.player-demo {
  margin: 24px 0;
}

ivkit-player {
  border-radius: 12px;
}

.player-demo-log {
  margin: 12px 0 0;
  padding: 12px 16px;
  list-style: none;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.7;
}

.player-demo-log li {
  margin: 0;
}

.player-demo-log li:first-child:not(.empty) {
  color: var(--vp-c-brand-1);
}

.player-demo-log .empty {
  color: var(--vp-c-text-3);
}
</style>
