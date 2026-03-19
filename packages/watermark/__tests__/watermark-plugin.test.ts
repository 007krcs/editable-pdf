import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { applyTextWatermark, applyImageWatermark } from '../src/watermark-renderer.js';

describe('watermark-renderer', () => {
  it('applies text watermark to all pages', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    doc.addPage([612, 792]);
    await applyTextWatermark(doc, { text: 'DRAFT' });
    const bytes = await doc.save();
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('applies text watermark to specific pages', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    doc.addPage([612, 792]);
    await applyTextWatermark(doc, { text: 'CONFIDENTIAL', pages: [1], color: '#FF0000', fontSize: 60 });
    const bytes = await doc.save();
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('applies watermark with custom position', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    await applyTextWatermark(doc, { text: 'SAMPLE', position: 'bottom-right', rotation: 0, opacity: 0.5 });
    const bytes = await doc.save();
    expect(bytes.length).toBeGreaterThan(0);
  });
});
