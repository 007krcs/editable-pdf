import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Bookmark } from './bookmark-types.js';

async function resolvePageNumber(outline: any, pdfjsDoc: PDFDocumentProxy): Promise<number> {
  try {
    if (outline.dest) {
      const dest = typeof outline.dest === 'string'
        ? await pdfjsDoc.getDestination(outline.dest)
        : outline.dest;
      if (dest && dest[0]) {
        const pageIndex = await pdfjsDoc.getPageIndex(dest[0]);
        return pageIndex + 1;
      }
    }
  } catch {
    // ignore resolution errors
  }
  return 1;
}

async function convertOutline(items: any[], pdfjsDoc: PDFDocumentProxy): Promise<Bookmark[]> {
  const bookmarks: Bookmark[] = [];
  for (const item of items) {
    const pageNumber = await resolvePageNumber(item, pdfjsDoc);
    const children = item.items?.length > 0
      ? await convertOutline(item.items, pdfjsDoc)
      : [];
    bookmarks.push({
      title: item.title ?? 'Untitled',
      pageNumber,
      children,
    });
  }
  return bookmarks;
}

export async function readBookmarks(pdfjsDoc: PDFDocumentProxy): Promise<Bookmark[]> {
  const outline = await pdfjsDoc.getOutline();
  if (!outline || outline.length === 0) return [];
  return convertOutline(outline, pdfjsDoc);
}
