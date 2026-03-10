import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RenderQueue } from '../src/render-queue.js';

describe('RenderQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should enqueue and execute a task after debounce', async () => {
    const queue = new RenderQueue(50);
    const execute = vi.fn().mockResolvedValue(undefined);

    const promise = queue.enqueue(1, execute);
    expect(execute).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    await promise;

    expect(execute).toHaveBeenCalledOnce();
  });

  it('should deduplicate renders for the same page', async () => {
    const queue = new RenderQueue(50);
    const execute1 = vi.fn().mockResolvedValue(undefined);
    const execute2 = vi.fn().mockResolvedValue(undefined);

    // Enqueue two renders for the same page
    queue.enqueue(1, execute1);
    const promise2 = queue.enqueue(1, execute2);

    vi.advanceTimersByTime(50);
    await promise2;

    // Only the second one should execute (first was replaced)
    expect(execute1).not.toHaveBeenCalled();
    expect(execute2).toHaveBeenCalledOnce();
  });

  it('should process tasks sequentially', async () => {
    const queue = new RenderQueue(10);
    const order: number[] = [];

    const promise1 = queue.enqueue(1, async () => { order.push(1); });
    vi.advanceTimersByTime(10);

    const promise2 = queue.enqueue(2, async () => { order.push(2); });
    vi.advanceTimersByTime(10);

    await promise1;
    await promise2;

    expect(order).toEqual([1, 2]);
  });

  it('should handle task errors without stopping queue', async () => {
    const queue = new RenderQueue(10);

    const promise1 = queue.enqueue(1, async () => { throw new Error('fail'); });
    vi.advanceTimersByTime(10);

    await expect(promise1).rejects.toThrow('fail');

    // Queue should still work for next tasks
    const execute = vi.fn().mockResolvedValue(undefined);
    const promise2 = queue.enqueue(2, execute);
    vi.advanceTimersByTime(10);
    await promise2;

    expect(execute).toHaveBeenCalledOnce();
  });

  it('should clear all pending tasks', () => {
    const queue = new RenderQueue(100);
    const execute = vi.fn().mockResolvedValue(undefined);

    // Enqueue a task (promise stays pending due to debounce timer)
    queue.enqueue(1, execute);
    queue.clear();

    // After clearing, advancing timers should not trigger the execute
    vi.advanceTimersByTime(200);
    expect(execute).not.toHaveBeenCalled();
  });

  it('should use custom debounce time', async () => {
    const queue = new RenderQueue(200);
    const execute = vi.fn().mockResolvedValue(undefined);

    queue.enqueue(1, execute);
    vi.advanceTimersByTime(100);
    expect(execute).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    await vi.waitFor(() => expect(execute).toHaveBeenCalledOnce());
  });
});
