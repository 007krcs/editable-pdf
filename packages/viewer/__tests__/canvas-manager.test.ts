// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { CanvasManager } from '../src/canvas-manager.js';

describe('CanvasManager', () => {
  it('should create a canvas for a page', () => {
    const manager = new CanvasManager();
    const canvas = manager.create(1, 612, 792);

    expect(canvas.width).toBe(612);
    expect(canvas.height).toBe(792);
  });

  it('should retrieve a created canvas', () => {
    const manager = new CanvasManager();
    const created = manager.create(1, 100, 100);
    const retrieved = manager.get(1);

    expect(retrieved).toBe(created);
  });

  it('should return undefined for non-existent page', () => {
    const manager = new CanvasManager();
    expect(manager.get(99)).toBeUndefined();
  });

  it('should resize an existing canvas', () => {
    const manager = new CanvasManager();
    manager.create(1, 100, 100);
    manager.resize(1, 200, 300);

    const canvas = manager.get(1);
    expect(canvas?.width).toBe(200);
    expect(canvas?.height).toBe(300);
  });

  it('should dispose a single canvas', () => {
    const manager = new CanvasManager();
    manager.create(1, 100, 100);
    manager.create(2, 100, 100);

    manager.dispose(1);
    expect(manager.get(1)).toBeUndefined();
    expect(manager.get(2)).toBeDefined();
  });

  it('should dispose all canvases', () => {
    const manager = new CanvasManager();
    manager.create(1, 100, 100);
    manager.create(2, 100, 100);
    manager.create(3, 100, 100);

    manager.disposeAll();
    expect(manager.get(1)).toBeUndefined();
    expect(manager.get(2)).toBeUndefined();
    expect(manager.get(3)).toBeUndefined();
  });

  it('should return all canvases', () => {
    const manager = new CanvasManager();
    manager.create(1, 100, 100);
    manager.create(2, 200, 200);

    const all = manager.getAll();
    expect(all.size).toBe(2);
    expect(all.has(1)).toBe(true);
    expect(all.has(2)).toBe(true);
  });

  it('should replace canvas on duplicate create', () => {
    const manager = new CanvasManager();
    const first = manager.create(1, 100, 100);
    const second = manager.create(1, 200, 200);

    expect(second).not.toBe(first);
    expect(manager.get(1)).toBe(second);
    expect(manager.get(1)?.width).toBe(200);
  });
});
