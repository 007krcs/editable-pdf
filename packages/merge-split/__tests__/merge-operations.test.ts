import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mergePdfs, splitPdf, extractPages } from '../src/merge-operations.js';

async function createTestPdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([612, 792]);
  }
  return new Uint8Array(await doc.save());
}

describe('merge-operations', () => {
  it('merges multiple PDFs', async () => {
    const pdf1 = await createTestPdf(2);
    const pdf2 = await createTestPdf(3);
    const merged = await mergePdfs([pdf1, pdf2]);
    const doc = await PDFDocument.load(merged);
    expect(doc.getPageCount()).toBe(5);
  });

  it('throws on empty merge list', async () => {
    await expect(mergePdfs([])).rejects.toThrow('At least one PDF');
  });

  it('splits PDF into ranges', async () => {
    const pdf = await createTestPdf(4);
    const parts = await splitPdf(pdf, [{ start: 1, end: 2 }, { start: 3, end: 4 }]);
    expect(parts).toHaveLength(2);
    const doc1 = await PDFDocument.load(parts[0]);
    const doc2 = await PDFDocument.load(parts[1]);
    expect(doc1.getPageCount()).toBe(2);
    expect(doc2.getPageCount()).toBe(2);
  });

  it('extracts specific pages', async () => {
    const pdf = await createTestPdf(5);
    const extracted = await extractPages(pdf, [1, 3, 5]);
    const doc = await PDFDocument.load(extracted);
    expect(doc.getPageCount()).toBe(3);
  });
});
