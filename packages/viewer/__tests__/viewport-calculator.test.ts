import { describe, it, expect } from 'vitest';
import { calculateViewport } from '../src/viewport-calculator.js';

describe('calculateViewport', () => {
  it('should return page dimensions at default scale', () => {
    const vp = calculateViewport(612, 792);
    expect(vp.width).toBe(612);
    expect(vp.height).toBe(792);
    expect(vp.scale).toBe(1);
  });

  it('should scale dimensions', () => {
    const vp = calculateViewport(612, 792, { scale: 2 });
    expect(vp.width).toBe(1224);
    expect(vp.height).toBe(1584);
    expect(vp.scale).toBe(2);
  });

  it('should swap dimensions on 90 degree rotation', () => {
    const vp = calculateViewport(612, 792, { rotation: 90 });
    expect(vp.width).toBe(792);
    expect(vp.height).toBe(612);
  });

  it('should not swap on 180 degree rotation', () => {
    const vp = calculateViewport(612, 792, { rotation: 180 });
    expect(vp.width).toBe(612);
    expect(vp.height).toBe(792);
  });

  it('should handle DPI scaling', () => {
    const vp = calculateViewport(612, 792, { dpi: 144 });
    expect(vp.width).toBe(1224);
    expect(vp.height).toBe(1584);
    expect(vp.scale).toBe(2);
  });

  it('should combine scale and DPI', () => {
    const vp = calculateViewport(100, 200, { scale: 2, dpi: 144 });
    // totalScale = 2 * (144/72) = 4
    expect(vp.width).toBe(400);
    expect(vp.height).toBe(800);
    expect(vp.scale).toBe(4);
  });
});
