import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import type { RedactionArea } from './redaction-types.js';

export async function applyRedactions(pdfDoc: PDFDocument, redactions: RedactionArea[]): Promise<void> {
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const redaction of redactions) {
    const page = pages[redaction.pageNumber - 1];
    if (!page) continue;

    // Draw black rectangle to cover content
    page.drawRectangle({
      x: redaction.x,
      y: redaction.y,
      width: redaction.width,
      height: redaction.height,
      color: rgb(0, 0, 0),
    });

    // Optional label on redaction
    if (redaction.label) {
      const fontSize = Math.min(8, redaction.height * 0.6);
      page.drawText(redaction.label, {
        x: redaction.x + 2,
        y: redaction.y + (redaction.height - fontSize) / 2,
        size: fontSize,
        font,
        color: rgb(1, 1, 1),
      });
    }
  }
}
