import { describe, it, expect } from 'vitest';
import { viewportToPdfCoords } from '../src/placement-calculator.js';

describe('viewportToPdfCoords', () => {
  it('should convert top-left origin to bottom-left origin', () => {
    const coords = viewportToPdfCoords(
      { pageNumber: 1, x: 100, y: 100, width: 200, height: 50 },
      792, // standard letter page height in points
      1.0,
    );
    // pdfY = 792 - 100 - 50 = 642
    expect(coords.x).toBe(100);
    expect(coords.y).toBe(642);
    expect(coords.width).toBe(200);
    expect(coords.height).toBe(50);
  });

  it('should handle scale factor', () => {
    const coords = viewportToPdfCoords(
      { pageNumber: 1, x: 200, y: 200, width: 200, height: 50 },
      792,
      2.0,
    );
    // pdfX = 200/2 = 100; width/height are already PDF points (not scaled)
    // pdfY = 792 - (200/2) - 50 = 792 - 100 - 50 = 642
    expect(coords.x).toBe(100);
    expect(coords.y).toBe(642);
    expect(coords.width).toBe(200);
    expect(coords.height).toBe(50);
  });

  it('should place at top of page', () => {
    const coords = viewportToPdfCoords(
      { pageNumber: 1, x: 0, y: 0, width: 100, height: 50 },
      792,
      1.0,
    );
    // pdfY = 792 - 0 - 50 = 742
    expect(coords.y).toBe(742);
  });

  it('should place at bottom of page', () => {
    const coords = viewportToPdfCoords(
      { pageNumber: 1, x: 0, y: 742, width: 100, height: 50 },
      792,
      1.0,
    );
    // pdfY = 792 - 742 - 50 = 0
    expect(coords.y).toBe(0);
  });

  it('should pass through rotation degrees', () => {
    const coords = viewportToPdfCoords(
      { pageNumber: 1, x: 100, y: 100, width: 200, height: 50, rotation: 90 },
      792,
      1.0,
    );
    expect(coords.rotateDeg).toBe(90);
  });

  it('should default rotation to 0', () => {
    const coords = viewportToPdfCoords(
      { pageNumber: 1, x: 100, y: 100, width: 200, height: 50 },
      792,
      1.0,
    );
    expect(coords.rotateDeg).toBe(0);
  });
});
