import { PDFDocument, PDFPage, rgb, PDFName, PDFArray, PDFNumber, PDFDict, PDFRef } from 'pdf-lib';
import type { Annotation, TextMarkupAnnotation, FreehandAnnotation, TextNoteAnnotation } from './annotation-types.js';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

export function renderHighlight(page: PDFPage, ann: TextMarkupAnnotation): void {
  const { r, g, b } = hexToRgb(ann.color);
  for (const rect of ann.rects) {
    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: rgb(r, g, b),
      opacity: ann.opacity,
    });
  }
}

export function renderUnderline(page: PDFPage, ann: TextMarkupAnnotation): void {
  const { r, g, b } = hexToRgb(ann.color);
  for (const rect of ann.rects) {
    page.drawLine({
      start: { x: rect.x, y: rect.y },
      end: { x: rect.x + rect.width, y: rect.y },
      thickness: 1.5,
      color: rgb(r, g, b),
      opacity: ann.opacity,
    });
  }
}

export function renderStrikethrough(page: PDFPage, ann: TextMarkupAnnotation): void {
  const { r, g, b } = hexToRgb(ann.color);
  for (const rect of ann.rects) {
    const midY = rect.y + rect.height / 2;
    page.drawLine({
      start: { x: rect.x, y: midY },
      end: { x: rect.x + rect.width, y: midY },
      thickness: 1.5,
      color: rgb(r, g, b),
      opacity: ann.opacity,
    });
  }
}

export function renderFreehand(page: PDFPage, ann: FreehandAnnotation): void {
  const { r, g, b } = hexToRgb(ann.color);
  const points = ann.paths;
  for (let i = 0; i < points.length - 1; i++) {
    page.drawLine({
      start: { x: points[i].x, y: points[i].y },
      end: { x: points[i + 1].x, y: points[i + 1].y },
      thickness: ann.strokeWidth,
      color: rgb(r, g, b),
      opacity: ann.opacity,
    });
  }
}

export function renderTextNote(page: PDFPage, ann: TextNoteAnnotation, font: Awaited<ReturnType<PDFDocument['embedFont']>>): void {
  const { r, g, b } = hexToRgb(ann.color);
  const fontSize = 10;
  const padding = 4;
  const textWidth = font.widthOfTextAtSize(ann.content, fontSize);
  const textHeight = font.heightAtSize(fontSize);

  // Background
  page.drawRectangle({
    x: ann.x,
    y: ann.y - textHeight - padding,
    width: textWidth + padding * 2,
    height: textHeight + padding * 2,
    color: rgb(1, 1, 0.8),
    opacity: 0.9,
    borderColor: rgb(r, g, b),
    borderWidth: 1,
  });

  // Text
  page.drawText(ann.content, {
    x: ann.x + padding,
    y: ann.y - textHeight,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });
}

export async function renderAnnotation(pdfDoc: PDFDocument, page: PDFPage, annotation: Annotation): Promise<void> {
  switch (annotation.type) {
    case 'highlight':
      renderHighlight(page, annotation);
      break;
    case 'underline':
      renderUnderline(page, annotation);
      break;
    case 'strikethrough':
      renderStrikethrough(page, annotation);
      break;
    case 'freehand':
      renderFreehand(page, annotation);
      break;
    case 'text-note': {
      const { StandardFonts } = await import('pdf-lib');
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      renderTextNote(page, annotation, font);
      break;
    }
  }
}
