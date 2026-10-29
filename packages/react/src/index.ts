/**
 * `@ivkit/react`: `<ivkit-player>` as a React component. Sets `story`,
 * `renderHotspot` and plugins as properties, turns the player's events into
 * typed callbacks and forwards its ref to the element, in React 18 and 19.
 */
import "@ivkit/player";
import type {
  HotspotRenderer,
  IvkitPlayer as IvkitPlayerElement,
  IvkitPlayerEventMap,
  PlayerPlugin,
} from "@ivkit/player";
import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

export type { HotspotRenderer, IvkitPlayerElement, IvkitPlayerEventMap, PlayerPlugin };

/** Callback prop for each of the player's events. */
const events = {
  onScene: "iv-scene",
  onInteraction: "iv-interaction",
  onAnswer: "iv-answer",
  onTimeout: "iv-timeout",
  onHotspot: "iv-hotspot",
  onCues: "iv-cues",
  onEnd: "iv-end",
  onError: "iv-error",
} as const satisfies Record<string, keyof IvkitPlayerEventMap>;

type EventProps = {
  [P in keyof typeof events]?:
    | ((event: IvkitPlayerEventMap[(typeof events)[P]]) => void)
    | undefined;
};

export interface IvkitPlayerProps
  extends Omit<HTMLAttributes<IvkitPlayerElement>, keyof EventProps | "children">,
    EventProps {
  /** The story to play. Passing a different object resets the player. */
  story?: IvkitPlayerElement["story"] | undefined;
  /** Customizes each hotspot's button; see the element's `renderHotspot`. */
  renderHotspot?: HotspotRenderer | null | undefined;
  /**
   * Plugins to run, in order. Each one is added once and removed when it leaves the
   * array, so create them outside the component or memoize them: a new function on
   * every render would run again on every render.
   */
  plugins?: readonly PlayerPlugin[] | undefined;
  /** Shows the control bar and enables keyboard shortcuts. */
  controls?: boolean | undefined;
  /** Starts as soon as a story is set (browsers may block it unless `muted`). */
  autoplay?: boolean | undefined;
  muted?: boolean | undefined;
  /** Slotted content: give elements `slot="start"`, `slot="end"` or `slot="error"`. */
  children?: ReactNode;
}

// React 18 warns about layout effects during server rendering; they don't run there anyway.
const useIsomorphicLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

/**
 * `<ivkit-player>` for React. Takes the element's attributes as boolean props and
 * any other HTML attribute (`className`, `style`, …), and its `ref` is the element,
 * for methods like `play()` or `goTo()`.
 */
export const IvkitPlayer = forwardRef<IvkitPlayerElement, IvkitPlayerProps>(
  function IvkitPlayer(props, forwardedRef) {
    const {
      story,
      renderHotspot,
      plugins,
      controls,
      autoplay,
      muted,
      onScene,
      onInteraction,
      onAnswer,
      onTimeout,
      onHotspot,
      onCues,
      onEnd,
      onError,
      className,
      ...rest
    } = props;
    const ref = useRef<IvkitPlayerElement>(null);
    const callbacks = useRef<EventProps>({});
    /** Plugins in use, each with the function that removes it. */
    const used = useRef(new Map<PlayerPlugin, () => void>());

    useImperativeHandle(forwardedRef, () => ref.current!, []);

    // The effects run in order, so the player has its callbacks, renderer and plugins
    // before the story is set: setting it may play and emit events right away.
    useIsomorphicLayoutEffect(() => {
      callbacks.current = {
        onScene,
        onInteraction,
        onAnswer,
        onTimeout,
        onHotspot,
        onCues,
        onEnd,
        onError,
      };
    });

    useIsomorphicLayoutEffect(() => {
      const player = ref.current!;
      const offs = Object.entries(events).map(([prop, type]) => {
        const listener = (event: Event) =>
          (callbacks.current[prop as keyof EventProps] as ((event: Event) => void) | undefined)?.(
            event,
          );
        player.addEventListener(type, listener);
        return () => player.removeEventListener(type, listener);
      });
      return () => {
        for (const off of offs) off();
      };
    }, []);

    useIsomorphicLayoutEffect(() => {
      ref.current!.renderHotspot = renderHotspot ?? null;
    }, [renderHotspot]);

    useIsomorphicLayoutEffect(() => {
      const player = ref.current!;
      const next = new Set(plugins);
      for (const [plugin, remove] of used.current) {
        if (!next.has(plugin)) {
          remove();
          used.current.delete(plugin);
        }
      }
      for (const plugin of next) {
        if (!used.current.has(plugin)) used.current.set(plugin, player.use(plugin));
      }
    }, [plugins]);

    useIsomorphicLayoutEffect(
      () => () => {
        for (const remove of used.current.values()) remove();
        used.current.clear();
      },
      [],
    );

    useIsomorphicLayoutEffect(() => {
      const player = ref.current!;
      // Setting a story resets the player, so only set a new one (Strict Mode runs effects twice).
      if (player.story !== (story ?? null)) player.story = story ?? null;
    }, [story]);

    // On custom elements React 18 writes props as they're named (`classname`) and
    // booleans as strings (`controls="false"`, which counts as set).
    return createElement("ivkit-player", {
      ...rest,
      ref,
      class: className,
      controls: controls ? "" : undefined,
      autoplay: autoplay ? "" : undefined,
      muted: muted ? "" : undefined,
    });
  },
);
