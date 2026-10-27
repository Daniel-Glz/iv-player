export type Listener<T> = (payload: T) => void;

/** Minimal typed event emitter. `Events` maps each event name to its payload. */
export class Emitter<Events extends object> {
  private readonly listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  /** Subscribes to `type`. Returns a function that unsubscribes. */
  on<K extends keyof Events>(type: K, listener: Listener<Events[K]>): () => void {
    this.listeners[type] ??= new Set();
    this.listeners[type].add(listener);
    return () => this.off(type, listener);
  }

  off<K extends keyof Events>(type: K, listener: Listener<Events[K]>): void {
    this.listeners[type]?.delete(listener);
  }

  protected emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const listeners = this.listeners[type];
    if (!listeners) return;
    // Copy so listeners can unsubscribe while being called.
    for (const listener of [...listeners]) listener(payload);
  }
}
