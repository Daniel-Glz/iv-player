import { describe, expect, it } from "vitest";
import { minifyCss } from "../build/minify-css";
import { styles } from "../src/styles";
import "../src/index";

describe("minifyCss", () => {
  it("drops comments, even ones holding quotes", () => {
    expect(minifyCss('/* "a" */ a { color: red; } /* b */')).toBe("a{color:red}");
  });

  it("keeps strings as they are", () => {
    expect(minifyCss('a::before { content: "/* x */  y ;" }')).toBe(
      'a::before{content:"/* x */  y ;"}',
    );
  });

  it("keeps the spaces before selector parts, which are descendant combinators", () => {
    expect(minifyCss(".a :hover,\n.b [c='d'] > e {\n  color: red;\n}")).toBe(
      ".a :hover,.b [c='d']>e{color:red}",
    );
  });

  it("keeps the spaces values and queries need", () => {
    expect(
      minifyCss(
        "@container (max-width: 480px) {\n  a { margin: 0 auto; inset: calc(1px + 2%) }\n}",
      ),
    ).toBe("@container (max-width:480px){a{margin:0 auto;inset:calc(1px + 2%)}}");
  });
});

describe("the player's minified styles", () => {
  /** Every element the styles target: the player's shadow DOM plus what it adds while playing. */
  function elements(): Element[] {
    const player = document.createElement("ivkit-player");
    const root = player.shadowRoot!;
    root.querySelector("video")!.classList.add("front");
    root.querySelector(".stage")!.classList.add("idle");
    root.querySelector(".options")!.innerHTML =
      '<button data-id="a">A</button><button data-id="b" aria-pressed="false">B</button>';
    root.querySelector(".timer")!.innerHTML = "<div></div>";
    root.querySelector(".plugins")!.innerHTML = '<div part="plugin"></div>';
    root.querySelector(".hotspots")!.innerHTML = ["outline", "label", "hidden", "pulse"]
      .map(
        (variant) =>
          `<button data-variant="${variant}"><svg class="hotspot-svg"><rect class="hotspot-shape"/>` +
          '</svg><span class="hotspot-label"></span></button>',
      )
      .join("");
    return [...root.querySelectorAll("*")];
  }

  /** The rules of `css` in order, each reduced to what it applies and where. */
  function rules(css: string, targets: Element[]): unknown[] {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    // happy-dom keeps `var()` fallbacks as written, where spaces after commas don't matter.
    const declarations = (style: CSSStyleDeclaration) => style.cssText.replace(/, /g, ",");
    const describe = (rule: CSSRule): unknown => {
      if (rule instanceof CSSStyleRule) {
        const matches = (element: Element) => {
          try {
            return element.matches(rule.selectorText);
          } catch {
            return "invalid";
          }
        };
        return { matched: targets.map(matches), style: declarations(rule.style) };
      }
      if (rule instanceof CSSKeyframeRule)
        return { key: rule.keyText, style: declarations(rule.style) };
      if (rule instanceof CSSKeyframesRule) return { name: rule.name, rules: list(rule.cssRules) };
      if (rule instanceof CSSConditionRule) {
        return { condition: rule.conditionText.replace(/:\s+/g, ":"), rules: list(rule.cssRules) };
      }
      return rule.cssText;
    };
    const list = (rules: CSSRuleList) => [...rules].map(describe);
    return list(sheet.cssRules);
  }

  it("keep every rule, declaration and match", () => {
    const targets = elements();
    const original = rules(styles, targets);
    expect(original).toHaveLength(41);
    expect(rules(minifyCss(styles), targets)).toEqual(original);
  });

  it("are much smaller", () => {
    expect(minifyCss(styles).length).toBeLessThan(styles.length * 0.8);
  });
});
