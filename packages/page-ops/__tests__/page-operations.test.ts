import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { addBlankPage, deletePage, rotatePage, reorderPages, getPageInfo } from '../src/page-operations.js';

async function createTestDoc(pageCount = 3): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([612, 792]);
  }
  return doc;
}

describe('page-operations', () => {
  it('adds a blank page at end', async () => {
    const doc = await createTestDoc(2);
    const pageNum = addBlankPage(doc);
    expect(pageNum).toBe(3);
    expect(doc.getPageCount()).toBe(3);
  });

  it('inserts a page at specific position', async () => {
    const doc = await createTestDoc(2);
    const pageNum = addBlankPage(doc, { insertAt: 0 });
    expect(pageNum).toBe(1);
    expect(doc.getPageCount()).toBe(3);
  });

  it('adds A4 page', async () => {
    const doc = await createTestDoc(1);
    addBlankPage(doc, { size: 'a4' });
    const page = doc.getPage(1);
    expect(Math.round(page.getWidth())).toBe(595);
  });

  it('deletes a page', async () => {
    const doc = await createTestDoc(3);
    deletePage(doc, 2);
    expect(doc.getPageCount()).toBe(2);
  });

  it('throws when deleting last page', async () => {
    const doc = await createTestDoc(1);
    expect(() => deletePage(doc, 1)).toThrow('Cannot delete the last remaining page');
  });

  it('throws on invalid page number', async () => {
    const doc = await createTestDoc(2);
    expect(() => deletePage(doc, 5)).toThrow('out of range');
  });

  it('rotates a page', async () => {
    const doc = await createTestDoc(1);
    rotatePage(doc, 1, 90);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
  });

  it('accumulates rotation', async () => {
    const doc = await createTestDoc(1);
    rotatePage(doc, 1, 90);
    rotatePage(doc, 1, 90);
    expect(doc.getPage(0).getRotation().angle).toBe(180);
  });

  it('reorders pages', async () => {
    const doc = await createTestDoc(3);
    const newDoc = await reorderPages(doc, [3, 1, 2]);
    expect(newDoc.getPageCount()).toBe(3);
  });

  it('throws on invalid reorder', async () => {
    const doc = await createTestDoc(3);
    await expect(reorderPages(doc, [1, 2])).rejects.toThrow('must have 3 entries');
  });

  it('gets page info', async () => {
    const doc = await createTestDoc(2);
    const info = getPageInfo(doc);
    expect(info).toHaveLength(2);
    expect(info[0].width).toBe(612);
    expect(info[0].height).toBe(792);
  });
});
