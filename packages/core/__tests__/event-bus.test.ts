import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../src/event-bus.js';

interface TestEventMap {
  'test:event': { readonly value: number };
  'test:other': { readonly message: string };
}

describe('EventBus', () => {
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
});
