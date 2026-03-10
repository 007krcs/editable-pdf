import { PDFDocument, type PDFImage } from 'pdf-lib';

function detectImageFormat(bytes: Uint8Array): 'png' | 'jpeg' {
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  throw new Error('Unsupported image format. Only PNG and JPEG are supported.');
}

export async function embedImage(
  pdfDoc: PDFDocument,
  imageBytes: Uint8Array,
): Promise<PDFImage> {
  const format = detectImageFormat(imageBytes);
  if (format === 'png') {
    return pdfDoc.embedPng(imageBytes);
  }
  return pdfDoc.embedJpg(imageBytes);
}
