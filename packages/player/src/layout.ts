export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Where a picture of `mediaWidth × mediaHeight` is drawn inside a box with
 * `object-fit: contain`, i.e. excluding the letterbox bars. Falls back to the
 * whole box while the media size is unknown.
 */
export function containRect(
  boxWidth: number,
  boxHeight: number,
  mediaWidth: number,
  mediaHeight: number,
): Rect {
  if (mediaWidth <= 0 || mediaHeight <= 0) {
    return { left: 0, top: 0, width: boxWidth, height: boxHeight };
  }
  const scale = Math.min(boxWidth / mediaWidth, boxHeight / mediaHeight);
  const width = mediaWidth * scale;
  const height = mediaHeight * scale;
  return { left: (boxWidth - width) / 2, top: (boxHeight - height) / 2, width, height };
}
