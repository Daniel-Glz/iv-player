/** A CSS string literal, with its escapes. */
const STRING = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/;

/**
 * Minifies the player's CSS at build time: drops comments and the whitespace that
 * never matters, leaving strings as they are. It keeps any space before a selector
 * part (`.a :hover`, `.a [b]`), which is a descendant combinator, so it's safe for
 * these styles but isn't a general minifier.
 */
export function minifyCss(css: string): string {
  // Comments first, skipping strings: a comment may contain quotes and a string `/*`.
  const code = css.replace(
    new RegExp(`/\\*[\\s\\S]*?\\*/|${STRING.source}`, "g"),
    (_, string?: string) => string ?? "",
  );
  return code
    .split(STRING)
    .map((part, i) =>
      // Odd parts are the strings captured by the split.
      i % 2 === 1
        ? part
        : part
            .replace(/\s+/g, " ")
            .replace(/ ?([{};,>]) ?/g, "$1")
            .replace(/: /g, ":")
            .replace(/;}/g, "}"),
    )
    .join("")
    .trim();
}
