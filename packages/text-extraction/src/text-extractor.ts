import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextItem, PageText } from './text-types.js';

export async function extractPageText(pdfjsDoc: PDFDocumentProxy, pageNumber: number): Promise<PageText> {
  const page = await pdfjsDoc.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1.0 });

  const items: TextItem[] = [];
  let fullText = '';

  for (const item of textContent.items) {
    if (!('str' in item)) continue;
    const tx = item.transform;
    const x = tx[4];
    const y = viewport.height - tx[5];
    const width = item.width;
    const height = item.height;

    items.push({
      text: item.str,
      x,
      y,
      width,
      height,
      pageNumber,
    });

    fullText += item.str;
    if (item.hasEOL) fullText += '\n';
    else fullText += ' ';
  }

  return { pageNumber, text: fullText.trim(), items };
}

export async function extractAllText(pdfjsDoc: PDFDocumentProxy): Promise<PageText[]> {
  const pages: PageText[] = [];
  for (let i = 1; i <= pdfjsDoc.numPages; i++) {
    pages.push(await extractPageText(pdfjsDoc, i));
  }
  return pages;
}
