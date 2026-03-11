import type { TypedEventEmitter } from '@docsdk/shared-types';

/** Internal listener type */
type Listener<T> = (payload: T) => void;

/** Error info from a failed listener */
export interface EventBusError {
  readonly event: string | number | symbol;
  readonly error: unknown;
  readonly listener: Function;
}

/**
 * Concrete typed event emitter with error isolation.
 *
 * Key guarantee: if one listener throws, all remaining listeners for
 * that event still execute. Errors are collected and reported via
 * an optional `onError` callback, or re-thrown as an AggregateError
 * after all listeners have run.
 */
export class EventBus<TMap> implements TypedEventEmitter<TMap> {
  private readonly listeners = new Map<keyof TMap, Set<Listener<unknown>>>();
  private readonly maxListeners: number;
  private readonly onError?: (err: EventBusError) => void;

  constructor(options: { maxListeners?: number; onError?: (err: EventBusError) => void } = {}) {
    this.maxListeners = options.maxListeners ?? 100;
    this.onError = options.onError;
  }

  on<K extends keyof TMap>(event: K, listener: Listener<TMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;

    if (set.size >= this.maxListeners) {
      console.warn(
        `[EventBus] Max listeners (${this.maxListeners}) exceeded for event "${String(event)}". ` +
        `Possible memory leak.`,
      );
    }

    set.add(listener as Listener<unknown>);
    return () => {
      set.delete(listener as Listener<unknown>);
    };
  }

  once<K extends keyof TMap>(event: K, listener: Listener<TMap[K]>): () => void {
    const wrapper = ((payload: TMap[K]) => {
      unsub();
      listener(payload);
    }) as Listener<TMap[K]>;
    const unsub = this.on(event, wrapper);
    return unsub;
  }

  off<K extends keyof TMap>(event: K, listener: Listener<TMap[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener as Listener<unknown>);
    }
  }

  emit<K extends keyof TMap>(event: K, payload: TMap[K]): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;

    const errors: EventBusError[] = [];

    // Snapshot to protect against mutation during iteration.
    // Each listener runs in a try/catch — one failure does NOT block others.
    for (const listener of [...set]) {
      try {
        listener(payload);
      } catch (error) {
        const info: EventBusError = { event, error, listener };
        if (this.onError) {
          this.onError(info);
        } else {
          errors.push(info);
        }
      }
    }

    // If no custom handler and there were errors, throw an aggregate
    if (errors.length > 0) {
      const messages = errors.map(
        (e) => `Listener for "${String(e.event)}" threw: ${e.error instanceof Error ? e.error.message : String(e.error)}`,
      );
      throw new AggregateError(
        errors.map((e) => e.error),
        `${errors.length} listener(s) failed during "${String(event)}": ${messages.join('; ')}`,
      );
    }
  }

  /** Number of listeners for a given event. */
  listenerCount<K extends keyof TMap>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
