import { describe, it, expect, vi } from 'vitest';
import { SecurityPlugin } from '../src/security-plugin.js';
import type { PluginContext } from '@docsdk/shared-types';
import { PDFSecurityError } from '../src/pdf-validator.js';

function createMockContext(): PluginContext {
  return {
    events: {
      on: vi.fn(() => () => {}),
      once: vi.fn(() => () => {}),
      off: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    documentController: {
      state: 'IDLE' as any,
      currentBytes: null,
      pageCount: 0,
      updateBytes: vi.fn(),
      setPageCount: vi.fn(),
    },
    getPlugin: vi.fn(),
  };
}

function createMinimalPdf(): Uint8Array {
  return new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\ntrailer\n<< /Root 1 0 R >>\nstartxref\n0\n%%EOF');
}

describe('SecurityPlugin', () => {
  it('should have correct metadata', () => {
    const plugin = new SecurityPlugin();
    expect(plugin.name).toBe('security');
    expect(plugin.version).toBe('0.1.0');
    expect(plugin.capabilities).toContain('security');
  });

  it('should validate valid PDFs without error', () => {
    const plugin = new SecurityPlugin();
    const ctx = createMockContext();
    plugin.initialize(ctx);

    expect(() => plugin.validate(createMinimalPdf())).not.toThrow();
  });

  it('should reject invalid PDFs and emit event', () => {
    const plugin = new SecurityPlugin();
    const ctx = createMockContext();
    plugin.initialize(ctx);

    expect(() => plugin.validate(new Uint8Array(0))).toThrow(PDFSecurityError);
    expect(ctx.events.emit).toHaveBeenCalledWith('security:validation-failed', expect.objectContaining({
      error: expect.any(Error),
    }));
  });

  it('should support runtime config updates', () => {
    const plugin = new SecurityPlugin({ maxFileSize: 1000 });
    const ctx = createMockContext();
    plugin.initialize(ctx);

    const header = new TextEncoder().encode('%PDF-1.4\n');
    const big = new Uint8Array(2000);
    big.set(header);

    expect(() => plugin.validate(big)).toThrow(PDFSecurityError);

    plugin.updateConfig({ maxFileSize: 10000 });
    expect(() => plugin.validate(big)).not.toThrow();
  });

  it('should return config via getConfig', () => {
    const plugin = new SecurityPlugin({ maxFileSize: 5000 });
    const config = plugin.getConfig();
    expect(config.maxFileSize).toBe(5000);
  });

  it('should clean up on destroy', () => {
    const plugin = new SecurityPlugin();
    const ctx = createMockContext();
    plugin.initialize(ctx);
    plugin.destroy();
    // After destroy, validate still works (stateless) but events won't emit
    expect(() => plugin.validate(createMinimalPdf())).not.toThrow();
  });
});
