import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import CoreDemo from "./components/CoreDemo.vue";
import LessonDemo from "./components/LessonDemo.vue";
import PlayerDemo from "./components/PlayerDemo.vue";
import StoriesDemo from "./components/StoriesDemo.vue";
import Unreleased from "./components/Unreleased.vue";
import ValidationPlayground from "./components/ValidationPlayground.vue";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("PlayerDemo", PlayerDemo);
    app.component("CoreDemo", CoreDemo);
    app.component("LessonDemo", LessonDemo);
    app.component("StoriesDemo", StoriesDemo);
    app.component("ValidationPlayground", ValidationPlayground);
    app.component("Unreleased", Unreleased);
  },
} satisfies Theme;
