import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelemetryPlugin } from '../src/telemetry-plugin.js';

function createMockContext() {
  const handlers = new Map<string, Function[]>();
  return {
    events: {
      on: vi.fn((event: string, handler: Function) => {
        if (!handlers.has(event)) handlers.set(event, []);
        handlers.get(event)!.push(handler);
        return () => {
          const arr = handlers.get(event);
          if (arr) {
            const idx = arr.indexOf(handler);
            if (idx !== -1) arr.splice(idx, 1);
          }
        };
      }),
      emit: vi.fn(),
    },
    getPlugin: vi.fn(),
    _emit(event: string, payload: any) {
      for (const h of handlers.get(event) ?? []) h(payload);
    },
  };
}

describe('TelemetryPlugin', () => {
  let plugin: TelemetryPlugin;
  let ctx: ReturnType<typeof createMockContext>;

  beforeEach(async () => {
    plugin = new TelemetryPlugin();
    ctx = createMockContext();
    await plugin.initialize(ctx as any);
  });

  it('has correct name and capabilities', () => {
    expect(plugin.name).toBe('telemetry');
    expect(plugin.capabilities).toContain('telemetry');
    expect(plugin.capabilities).toContain('error-tracking');
  });

  it('tracks document load timing', () => {
    ctx._emit('document:loading', {});
    // Simulate some time passing
    ctx._emit('document:loaded', { pageCount: 5 });
    const summary = plugin.metrics.getSummary('document.load');
    expect(summary).toBeDefined();
    expect(summary!.count).toBe(1);
    expect(summary!.min).toBeGreaterThanOrEqual(0);
  });

  it('captures document errors', () => {
    ctx._emit('document:error', { error: new Error('load failed') });
    const errors = plugin.errors.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].error.message).toBe('load failed');
  });

  it('records custom metrics', () => {
    plugin.recordMetric('render.page', 42);
    const summary = plugin.metrics.getSummary('render.page');
    expect(summary!.count).toBe(1);
    expect(summary!.avg).toBe(42);
  });

  it('startTimer records duration', async () => {
    const stop = plugin.startTimer('custom.op');
    await new Promise((r) => setTimeout(r, 10));
    const duration = stop();
    expect(duration).toBeGreaterThan(0);
    const summary = plugin.metrics.getSummary('custom.op');
    expect(summary!.count).toBe(1);
  });

  it('adds breadcrumbs for events', () => {
    ctx._emit('field:changed', { fieldName: 'name', value: 'test' });
    ctx._emit('signature:placed', {});
    const err = plugin.errors.captureError(new Error('test'));
    expect(err.breadcrumbs.length).toBeGreaterThanOrEqual(2);
  });

  it('cleans up on destroy', async () => {
    await plugin.destroy();
    // After destroy, events should not trigger
    ctx._emit('document:loading', {});
    ctx._emit('document:loaded', { pageCount: 1 });
    expect(plugin.metrics.getSummary('document.load')).toBeUndefined();
  });
});
