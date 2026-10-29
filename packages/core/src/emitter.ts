// Core has no DOM or Node types, but every JavaScript runtime has this.
declare function queueMicrotask(callback: () => void): void;

export type Listener<T> = (payload: T) => void;

/** Minimal typed event emitter. `Events` maps each event name to its payload. */
export class Emitter<Events extends object> {
  #listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  /** Subscribes to `type`. Returns a function that unsubscribes. */
  on<K extends keyof Events>(type: K, listener: Listener<Events[K]>): () => void {
    this.#listeners[type] ??= new Set();
    this.#listeners[type].add(listener);
    return () => this.off(type, listener);
  }

  off<K extends keyof Events>(type: K, listener: Listener<Events[K]>): void {
    this.#listeners[type]?.delete(listener);
  }

  /** Removes every listener. */
  protected clear(): void {
    this.#listeners = {};
  }

  /**
   * Calls the listeners of `type`. One that throws doesn't stop the others nor what the
   * emitter does next; its error is rethrown on its own, so it's still reported, like
   * an error in a DOM event listener.
   */
  protected emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const listeners = this.#listeners[type];
    if (!listeners) return;
    // Copy so listeners can unsubscribe while being called.
    for (const listener of [...listeners]) {
      try {
        listener(payload);
      } catch (error) {
        queueMicrotask(() => {
          throw error;
        });
      }
    }
  }
}
