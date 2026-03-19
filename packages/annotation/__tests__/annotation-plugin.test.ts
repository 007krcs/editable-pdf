import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnotationPlugin } from '../src/annotation-plugin.js';
import type { PluginContext } from '@docsdk/shared-types';

function createMockContext(): PluginContext {
  const listeners = new Map<string, Function[]>();
  return {
    events: {
      on: vi.fn((event: string, listener: Function) => {
        const arr = listeners.get(event) ?? [];
        arr.push(listener);
        listeners.set(event, arr);
        return () => {};
      }),
      once: vi.fn(),
      off: vi.fn(),
      emit: vi.fn((event: string, payload: any) => {
        const arr = listeners.get(event) ?? [];
        arr.forEach((fn) => fn(payload));
      }),
      removeAllListeners: vi.fn(),
    },
    documentController: {
      state: 'READY' as any,
      currentBytes: new Uint8Array(),
      pageCount: 3,
      updateBytes: vi.fn(),
      setPageCount: vi.fn(),
    },
    getPlugin: vi.fn(),
  } as unknown as PluginContext;
}

describe('AnnotationPlugin', () => {
  let plugin: AnnotationPlugin;
  let ctx: PluginContext;

  beforeEach(() => {
    plugin = new AnnotationPlugin();
    ctx = createMockContext();
    plugin.initialize(ctx);
  });

  it('adds highlight annotations', () => {
    const ann = plugin.addHighlight(1, [{ x: 10, y: 20, width: 100, height: 12 }]);
    expect(ann.type).toBe('highlight');
    expect(ann.pageNumber).toBe(1);
    expect(ann.rects).toHaveLength(1);
    expect(ann.color).toBe('#FFFF00');
  });

  it('adds underline annotations', () => {
    const ann = plugin.addUnderline(1, [{ x: 10, y: 20, width: 100, height: 12 }], { color: '#00FF00' });
    expect(ann.type).toBe('underline');
    expect(ann.color).toBe('#00FF00');
  });

  it('adds strikethrough annotations', () => {
    const ann = plugin.addStrikethrough(2, [{ x: 10, y: 20, width: 100, height: 12 }]);
    expect(ann.type).toBe('strikethrough');
    expect(ann.pageNumber).toBe(2);
  });

  it('adds freehand annotations', () => {
    const ann = plugin.addFreehand(1, [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 5 }], { strokeWidth: 3 });
    expect(ann.type).toBe('freehand');
    expect(ann.paths).toHaveLength(3);
    expect(ann.strokeWidth).toBe(3);
  });

  it('adds text note annotations', () => {
    const ann = plugin.addTextNote(1, 50, 100, 'This is a note');
    expect(ann.type).toBe('text-note');
    expect(ann.content).toBe('This is a note');
  });

  it('retrieves annotations by page', () => {
    plugin.addHighlight(1, [{ x: 0, y: 0, width: 10, height: 10 }]);
    plugin.addHighlight(2, [{ x: 0, y: 0, width: 10, height: 10 }]);
    plugin.addFreehand(1, [{ x: 0, y: 0 }]);
    expect(plugin.getAnnotations(1)).toHaveLength(2);
    expect(plugin.getAnnotations(2)).toHaveLength(1);
    expect(plugin.getAnnotations()).toHaveLength(3);
  });

  it('removes annotations', () => {
    const ann = plugin.addHighlight(1, [{ x: 0, y: 0, width: 10, height: 10 }]);
    expect(plugin.removeAnnotation(ann.id)).toBe(true);
    expect(plugin.getAnnotations()).toHaveLength(0);
  });

  it('clears annotations for a page', () => {
    plugin.addHighlight(1, [{ x: 0, y: 0, width: 10, height: 10 }]);
    plugin.addHighlight(2, [{ x: 0, y: 0, width: 10, height: 10 }]);
    plugin.clearAnnotations(1);
    expect(plugin.getAnnotations()).toHaveLength(1);
    expect(plugin.getAnnotations(2)).toHaveLength(1);
  });

  it('clears all annotations on document close', () => {
    plugin.addHighlight(1, [{ x: 0, y: 0, width: 10, height: 10 }]);
    (ctx.events.emit as any)('document:closed', {});
    expect(plugin.getAnnotations()).toHaveLength(0);
  });
});
