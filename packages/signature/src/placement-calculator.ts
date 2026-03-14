import type { SignaturePlacement } from '@docsdk/shared-types';

export interface PDFCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Rotation in degrees */
  rotateDeg: number;
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
  // width/height are already in PDF points; x/y are viewport pixels that need descaling
  const pdfWidth = placement.width;
  const pdfHeight = placement.height;
  const pdfX = placement.x / scale;
  // PDF uses bottom-left origin, viewport uses top-left
  const pdfY = pageHeight - (placement.y / scale) - pdfHeight;
  const rotateDeg = placement.rotation ?? 0;

  return { x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight, rotateDeg };
}
