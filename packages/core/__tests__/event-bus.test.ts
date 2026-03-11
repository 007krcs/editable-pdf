import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../src/event-bus.js';
import type { EventBusError } from '../src/event-bus.js';

interface TestEventMap {
  'test:event': { readonly value: number };
  'test:other': { readonly message: string };
}

describe('EventBus', () => {
  // ── Basic functionality ─────────────────────────────────────

  it('should call listener on emit', () => {
    const bus = new EventBus<TestEventMap>();
    const listener = vi.fn();
    bus.on('test:event', listener);
    bus.emit('test:event', { value: 42 });
    expect(listener).toHaveBeenCalledWith({ value: 42 });
  });

  it('should support multiple listeners for the same event', () => {
    const bus = new EventBus<TestEventMap>();
    const l1 = vi.fn();
    const l2 = vi.fn();
    bus.on('test:event', l1);
    bus.on('test:event', l2);
    bus.emit('test:event', { value: 1 });
    expect(l1).toHaveBeenCalledOnce();
    expect(l2).toHaveBeenCalledOnce();
  });

  it('should unsubscribe via the returned function', () => {
    const bus = new EventBus<TestEventMap>();
    const listener = vi.fn();
    const unsub = bus.on('test:event', listener);
    unsub();
    bus.emit('test:event', { value: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('should unsubscribe via off()', () => {
    const bus = new EventBus<TestEventMap>();
    const listener = vi.fn();
    bus.on('test:event', listener);
    bus.off('test:event', listener);
    bus.emit('test:event', { value: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('should fire once() listener exactly once', () => {
    const bus = new EventBus<TestEventMap>();
    const listener = vi.fn();
    bus.once('test:event', listener);
    bus.emit('test:event', { value: 1 });
    bus.emit('test:event', { value: 2 });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ value: 1 });
  });

  it('should isolate listeners by event name', () => {
    const bus = new EventBus<TestEventMap>();
    const listener = vi.fn();
    bus.on('test:event', listener);
    bus.emit('test:other', { message: 'hello' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('should clear all listeners with removeAllListeners()', () => {
    const bus = new EventBus<TestEventMap>();
    const l1 = vi.fn();
    const l2 = vi.fn();
    bus.on('test:event', l1);
    bus.on('test:other', l2);
    bus.removeAllListeners();
    bus.emit('test:event', { value: 1 });
    bus.emit('test:other', { message: 'hi' });
    expect(l1).not.toHaveBeenCalled();
    expect(l2).not.toHaveBeenCalled();
  });

  it('should handle emit with no listeners gracefully', () => {
    const bus = new EventBus<TestEventMap>();
    expect(() => bus.emit('test:event', { value: 1 })).not.toThrow();
  });

  it('should allow once() to be cancelled before firing', () => {
    const bus = new EventBus<TestEventMap>();
    const listener = vi.fn();
    const unsub = bus.once('test:event', listener);
    unsub();
    bus.emit('test:event', { value: 99 });
    expect(listener).not.toHaveBeenCalled();
  });

  // ── Error isolation (v2) ────────────────────────────────────

  it('should continue calling remaining listeners when one throws', () => {
    const bus = new EventBus<TestEventMap>();
    const l1 = vi.fn();
    const failing = vi.fn(() => { throw new Error('boom'); });
    const l3 = vi.fn();

    bus.on('test:event', l1);
    bus.on('test:event', failing);
    bus.on('test:event', l3);

    expect(() => bus.emit('test:event', { value: 1 })).toThrow(AggregateError);
    expect(l1).toHaveBeenCalledOnce();
    expect(failing).toHaveBeenCalledOnce();
    expect(l3).toHaveBeenCalledOnce();
  });

  it('should throw AggregateError collecting all listener errors', () => {
    const bus = new EventBus<TestEventMap>();
    bus.on('test:event', () => { throw new Error('err1'); });
    bus.on('test:event', () => { throw new Error('err2'); });

    try {
      bus.emit('test:event', { value: 1 });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AggregateError);
      const agg = err as AggregateError;
      expect(agg.errors).toHaveLength(2);
      expect(agg.message).toContain('2 listener(s) failed');
    }
  });

  it('should use onError callback instead of throwing when provided', () => {
    const errors: EventBusError[] = [];
    const bus = new EventBus<TestEventMap>({ onError: (e) => errors.push(e) });
    const good = vi.fn();

    bus.on('test:event', () => { throw new Error('handled'); });
    bus.on('test:event', good);

    expect(() => bus.emit('test:event', { value: 1 })).not.toThrow();
    expect(good).toHaveBeenCalledOnce();
    expect(errors).toHaveLength(1);
    expect(errors[0].event).toBe('test:event');
    expect((errors[0].error as Error).message).toBe('handled');
  });

  // ── listenerCount ───────────────────────────────────────────

  it('should return correct listenerCount', () => {
    const bus = new EventBus<TestEventMap>();
    expect(bus.listenerCount('test:event')).toBe(0);

    bus.on('test:event', () => {});
    expect(bus.listenerCount('test:event')).toBe(1);

    bus.on('test:event', () => {});
    expect(bus.listenerCount('test:event')).toBe(2);

    expect(bus.listenerCount('test:other')).toBe(0);
  });

  // ── maxListeners warning ────────────────────────────────────

  it('should warn when max listeners exceeded', () => {
    const bus = new EventBus<TestEventMap>({ maxListeners: 2 });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    bus.on('test:event', () => {});
    bus.on('test:event', () => {});
    expect(warnSpy).not.toHaveBeenCalled();

    bus.on('test:event', () => {});
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('Max listeners');

    warnSpy.mockRestore();
  });

  // ── Snapshot safety during iteration ────────────────────────

  it('should safely handle listener added during emit (snapshot)', () => {
    const bus = new EventBus<TestEventMap>();
    const nested = vi.fn();

    bus.on('test:event', () => {
      bus.on('test:event', nested);
    });

    bus.emit('test:event', { value: 1 });
    // Added during iteration — should NOT fire this time
    expect(nested).not.toHaveBeenCalled();

    bus.emit('test:event', { value: 2 });
    expect(nested).toHaveBeenCalledOnce();
  });
});
