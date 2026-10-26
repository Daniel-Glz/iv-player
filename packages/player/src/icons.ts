/** Inline SVG icons for the control bar, drawn with `currentColor`. */
const svg = (paths: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="currentColor" ` +
  `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const speaker = `<path d="M4 9h4l5-4v14l-5-4H4z"/>`;

export const icons = {
  play: svg(`<path d="M8 5v14l11-7z"/>`),
  pause: svg(`<path d="M7 5h3v14H7zM14 5h3v14h-3z"/>`),
  volume: svg(`${speaker}<path fill="none" d="M16.5 8.5a5 5 0 0 1 0 7"/>`),
  muted: svg(`${speaker}<path fill="none" d="M16 9.5l5 5m0-5-5 5"/>`),
  enterFullscreen: svg(`<path fill="none" d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>`),
  exitFullscreen: svg(`<path fill="none" d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/>`),
};

export type IconName = keyof typeof icons;
