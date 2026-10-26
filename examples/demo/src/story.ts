import type { Story } from "@iv-player/core";

/**
 * Demo story. Videos come from scripts/generate-videos.mjs, which draws each
 * hotspot's box at the same area, so the clickable region should cover it exactly.
 *
 * intro ─┬─ hotspot "puerta" (2–6s) ──────→ puerta ─┐
 *        └─ question at 7s: bosque / rio ─→ bosque ─┼─→ final
 *                                         → rio ────┘  (4:3, info-only hotspot)
 */
export const story: Story = {
  version: "0.1",
  start: "intro",
  scenes: {
    intro: {
      src: "/videos/intro.mp4",
      events: [
        {
          type: "hotspot",
          id: "puerta",
          from: 2,
          to: 6,
          area: { x: 0.68, y: 0.3, width: 0.14, height: 0.5 },
          label: "Abrir la puerta",
          goto: "puerta",
        },
        {
          type: "question",
          id: "camino",
          at: 7,
          text: "¿A dónde vamos?",
          options: [
            { id: "bosque", label: "Al bosque", goto: "bosque" },
            { id: "rio", label: "Al río", goto: "rio" },
          ],
        },
      ],
    },
    puerta: { src: "/videos/puerta.mp4", next: "final" },
    bosque: { src: "/videos/bosque.mp4", next: "final" },
    rio: {
      src: "/videos/rio.mp4",
      next: "final",
      events: [
        {
          type: "hotspot",
          id: "piedra",
          from: 1,
          to: 5,
          area: { x: 0.4, y: 0.52, width: 0.2, height: 0.2 },
          label: "Mirar la piedra",
        },
      ],
    },
    final: { src: "/videos/final.mp4" },
  },
};
