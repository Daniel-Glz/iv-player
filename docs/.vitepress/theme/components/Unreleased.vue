<script setup lang="ts">
import { withBase } from "vitepress";

// Marks features on main that aren't in the npm release yet. On release, remove
// every <Unreleased /> and the sentences saying what's "new since 0.1.1".
</script>

<template>
  <a
    class="unreleased ignore-header"
    :href="withBase('/changelog#unreleased')"
    title="On main, not in the npm release yet. See the changelog."
  >
    <Badge type="warning" text="Unreleased" />
  </a>
</template>

<style scoped>
.unreleased,
.unreleased:hover {
  text-decoration: none;
}
</style>
