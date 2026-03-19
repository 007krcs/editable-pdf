import { PDFDocument, degrees } from 'pdf-lib';
import type { PageInfo, AddPageOptions } from './page-ops-types.js';
import { PAGE_SIZES } from './page-ops-types.js';

export function getPageInfo(pdfDoc: PDFDocument): PageInfo[] {
  const pages = pdfDoc.getPages();
  return pages.map((page, i) => ({
    pageNumber: i + 1,
    width: page.getWidth(),
    height: page.getHeight(),
    rotation: page.getRotation().angle,
  }));
}

export function addBlankPage(pdfDoc: PDFDocument, options: AddPageOptions = {}): number {
  const size = options.size ?? 'letter';
  const dims = PAGE_SIZES[size] ?? PAGE_SIZES['letter'];
  const width = options.width ?? dims.width;
  const height = options.height ?? dims.height;

  if (options.insertAt !== undefined && options.insertAt >= 0 && options.insertAt < pdfDoc.getPageCount()) {
    pdfDoc.insertPage(options.insertAt, [width, height]);
    return options.insertAt + 1;
  } else {
    pdfDoc.addPage([width, height]);
    return pdfDoc.getPageCount();
  }
}

export function deletePage(pdfDoc: PDFDocument, pageNumber: number): void {
  if (pageNumber < 1 || pageNumber > pdfDoc.getPageCount()) {
    throw new Error(`Page ${pageNumber} is out of range (1-${pdfDoc.getPageCount()})`);
  }
  if (pdfDoc.getPageCount() <= 1) {
    throw new Error('Cannot delete the last remaining page');
  }
  pdfDoc.removePage(pageNumber - 1);
}

export function rotatePage(pdfDoc: PDFDocument, pageNumber: number, angle: number): void {
  if (pageNumber < 1 || pageNumber > pdfDoc.getPageCount()) {
    throw new Error(`Page ${pageNumber} is out of range (1-${pdfDoc.getPageCount()})`);
  }
  const page = pdfDoc.getPage(pageNumber - 1);
  const currentRotation = page.getRotation().angle;
  page.setRotation(degrees((currentRotation + angle) % 360));
}

export async function reorderPages(pdfDoc: PDFDocument, newOrder: number[]): Promise<PDFDocument> {
  const pageCount = pdfDoc.getPageCount();
  if (newOrder.length !== pageCount) {
    throw new Error(`New order must have ${pageCount} entries, got ${newOrder.length}`);
  }

  const sorted = [...newOrder].sort();
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) {
      throw new Error('New order must contain all page numbers exactly once');
    }
  }

  const bytes = await pdfDoc.save();
  const srcDoc = await PDFDocument.load(bytes);
  const newDoc = await PDFDocument.create();

  for (const pageNum of newOrder) {
    const [copiedPage] = await newDoc.copyPages(srcDoc, [pageNum - 1]);
    newDoc.addPage(copiedPage);
  }

  return newDoc;
}
