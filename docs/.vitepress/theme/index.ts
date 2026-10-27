import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import CoreDemo from "./components/CoreDemo.vue";
import PlayerDemo from "./components/PlayerDemo.vue";
import ValidationPlayground from "./components/ValidationPlayground.vue";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("PlayerDemo", PlayerDemo);
    app.component("CoreDemo", CoreDemo);
    app.component("ValidationPlayground", ValidationPlayground);
  },
} satisfies Theme;
