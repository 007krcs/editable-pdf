import type { TypedEventEmitter } from '@docsdk/shared-types';

/** Internal listener type */
type Listener<T> = (payload: T) => void;

/**
 * Concrete typed event emitter.
 * Generic `TMap` maps event names to payload types.
 * No constraint is needed — `keyof TMap` enforces valid event names at call sites.
 */
export class EventBus<TMap> implements TypedEventEmitter<TMap> {
  private readonly listeners = new Map<keyof TMap, Set<Listener<unknown>>>();

  on<K extends keyof TMap>(event: K, listener: Listener<TMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener<unknown>);
    return () => {
      set.delete(listener as Listener<unknown>);
    };
  }

  once<K extends keyof TMap>(event: K, listener: Listener<TMap[K]>): () => void {
    const wrapper = ((payload: TMap[K]) => {
      this.off(event, wrapper);
      listener(payload);
    }) as Listener<TMap[K]>;
    return this.on(event, wrapper);
  }

  off<K extends keyof TMap>(event: K, listener: Listener<TMap[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener as Listener<unknown>);
    }
  }

  emit<K extends keyof TMap>(event: K, payload: TMap[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      // Snapshot to protect against mutation during iteration
      for (const listener of [...set]) {
        listener(payload);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
