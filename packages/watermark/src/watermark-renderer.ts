import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import type { TextWatermarkOptions, ImageWatermarkOptions } from './watermark-types.js';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

function getPosition(
  position: string,
  pageWidth: number,
  pageHeight: number,
  elWidth: number,
  elHeight: number,
): { x: number; y: number } {
  switch (position) {
    case 'top-left': return { x: 20, y: pageHeight - elHeight - 20 };
    case 'top-right': return { x: pageWidth - elWidth - 20, y: pageHeight - elHeight - 20 };
    case 'bottom-left': return { x: 20, y: 20 };
    case 'bottom-right': return { x: pageWidth - elWidth - 20, y: 20 };
    case 'center':
    default: return { x: (pageWidth - elWidth) / 2, y: (pageHeight - elHeight) / 2 };
  }
}

export async function applyTextWatermark(pdfDoc: PDFDocument, options: TextWatermarkOptions): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = options.fontSize ?? 48;
  const { r, g, b } = hexToRgb(options.color ?? '#CCCCCC');
  const opacity = options.opacity ?? 0.3;
  const rotation = options.rotation ?? -45;
  const pages = pdfDoc.getPages();

  const targetPages = options.pages === 'all' || !options.pages
    ? pages.map((_, i) => i)
    : options.pages.map((p) => p - 1);

  const textWidth = font.widthOfTextAtSize(options.text, fontSize);
  const textHeight = font.heightAtSize(fontSize);

  for (const idx of targetPages) {
    const page = pages[idx];
    if (!page) continue;
    const { width, height } = page.getSize();
    const pos = getPosition(options.position ?? 'center', width, height, textWidth, textHeight);

    page.drawText(options.text, {
      x: pos.x,
      y: pos.y,
      size: fontSize,
      font,
      color: rgb(r, g, b),
      opacity,
      rotate: degrees(rotation),
    });
  }
}

export async function applyImageWatermark(pdfDoc: PDFDocument, options: ImageWatermarkOptions): Promise<void> {
  const bytes = options.imageBytes;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

  const imgWidth = options.width ?? image.width * 0.5;
  const imgHeight = options.height ?? image.height * 0.5;
  const opacity = options.opacity ?? 0.2;
  const pages = pdfDoc.getPages();

  const targetPages = options.pages === 'all' || !options.pages
    ? pages.map((_, i) => i)
    : options.pages.map((p) => p - 1);

  for (const idx of targetPages) {
    const page = pages[idx];
    if (!page) continue;
    const { width, height } = page.getSize();
    const pos = getPosition(options.position ?? 'center', width, height, imgWidth, imgHeight);

    page.drawImage(image, {
      x: pos.x,
      y: pos.y,
      width: imgWidth,
      height: imgHeight,
      opacity,
    });
  }
}
