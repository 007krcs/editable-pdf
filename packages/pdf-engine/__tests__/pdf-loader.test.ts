import { describe, it, expect, vi } from 'vitest';
import { loadPdfBytes } from '../src/pdf-loader.js';

describe('loadPdfBytes', () => {
  it('should load from Uint8Array buffer', async () => {
    const input = new Uint8Array([1, 2, 3]);
    const result = await loadPdfBytes({ type: 'buffer', buffer: input });
    expect(result).toBe(input);
  });

  it('should convert ArrayBuffer to Uint8Array', async () => {
    const ab = new ArrayBuffer(3);
    new Uint8Array(ab).set([4, 5, 6]);
    const result = await loadPdfBytes({ type: 'buffer', buffer: ab });
    expect(result).toBeInstanceOf(Uint8Array);
    expect([...result]).toEqual([4, 5, 6]);
  });

  it('should fetch from URL', async () => {
    const mockBytes = new Uint8Array([10, 20]);
    const mockResponse = {
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(mockBytes.buffer),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await loadPdfBytes({ type: 'url', url: 'https://example.com/test.pdf' });
    expect(result).toBeInstanceOf(Uint8Array);
    expect([...result]).toEqual([10, 20]);
  });

  it('should throw on failed URL fetch', async () => {
    const mockResponse = { ok: false, status: 404, statusText: 'Not Found' };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(
      loadPdfBytes({ type: 'url', url: 'https://example.com/missing.pdf' }),
    ).rejects.toThrow('404');
  });
});
