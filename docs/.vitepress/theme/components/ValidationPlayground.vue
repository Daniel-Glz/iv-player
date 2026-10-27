<script setup lang="ts">
import { validateStory } from "@ivkit/core";
import { computed, ref } from "vue";

// Deliberately broken: a typo in a goto, a duplicate id, a negative time,
// an area outside the frame and a polygon without points.
const initial = {
  version: "0.1",
  start: "intro",
  scenes: {
    intro: {
      src: "intro.mp4",
      events: [
        {
          type: "question",
          id: "path",
          at: -2,
          text: "Where to?",
          options: [{ id: "forest", label: "Forest", goto: "forst" }],
        },
        {
          type: "hotspot",
          id: "path",
          from: 1,
          label: "Sign",
          area: { x: 0.9, y: 0.1, width: 0.2, height: 0.2 },
        },
        { type: "hotspot", id: "tree", from: 2, label: "Tree", shape: "polygon" },
      ],
    },
    forest: { src: "forest.mp4" },
  },
};

const source = ref(JSON.stringify(initial, null, 2));

const result = computed(() => {
  try {
    return { parsed: true as const, ...validateStory(JSON.parse(source.value)) };
  } catch (error) {
    return { parsed: false as const, message: (error as Error).message };
  }
});
</script>

<template>
  <div class="playground">
    <textarea v-model="source" spellcheck="false" aria-label="Story JSON" />
    <div class="result" aria-live="polite">
      <p v-if="!result.parsed" class="status bad">Invalid JSON: {{ result.message }}</p>
      <p v-else-if="result.valid" class="status good">✓ The story is valid.</p>
      <template v-else>
        <p class="status bad">{{ result.errors.length }} problems found</p>
        <ul>
          <li v-for="error in result.errors" :key="error.path + error.code + error.message">
            <code class="path">{{ error.path || "(root)" }}</code>
            <span class="code">{{ error.code }}</span>
            <span class="message">{{ error.message }}</span>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.playground {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin: 24px 0;
}

@media (min-width: 960px) {
  .playground {
    grid-template-columns: 1.1fr 1fr;
  }
}

textarea {
  min-height: 420px;
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-code-block-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

textarea:focus {
  border-color: var(--vp-c-brand-1);
  outline: none;
}

.result {
  padding: 14px 16px;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  font-size: 14px;
}

.status {
  margin: 0 0 8px;
  font-weight: 600;
}

.good {
  color: var(--vp-c-green-1);
}

.bad {
  color: var(--vp-c-red-1);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 8px 0;
  border-top: 1px solid var(--vp-c-divider);
}

.path {
  justify-self: start;
}

.code {
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}
</style>
