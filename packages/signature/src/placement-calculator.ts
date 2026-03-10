import type { SignaturePlacement } from '@docsdk/shared-types';

export interface PDFCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Converts viewport coordinates (top-left origin, scaled pixels) to
 * PDF coordinates (bottom-left origin, PDF points at 72 DPI).
 */
export function viewportToPdfCoords(
  placement: SignaturePlacement,
  pageHeight: number,
  scale = 1.0,
): PDFCoordinates {
  const pdfWidth = placement.width / scale;
  const pdfHeight = placement.height / scale;
  const pdfX = placement.x / scale;
  // PDF uses bottom-left origin, viewport uses top-left
  const pdfY = pageHeight - (placement.y / scale) - pdfHeight;

  return { x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight };
}
