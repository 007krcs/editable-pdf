import type { FileTypeInfo } from '@docsdk/shared-types';

/**
 * Magic byte sequences for supported file types.
 * Each entry maps a format name to its expected header bytes.
 */
const PDF_MAGIC: readonly number[] = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

/**
 * Detect the file type from raw bytes using magic byte analysis.
 *
 * Currently supports:
 * - **PDF**: `%PDF-` header (bytes `25 50 44 46 2D`)
 *
 * Future versions will add detection for DOCX, XLSX, images, etc.
 *
 * @param bytes - Raw file bytes (at least 5 bytes for reliable detection)
 * @returns A `FileTypeInfo` describing the detected type, version, and MIME type
 */
export function detectFileType(bytes: Uint8Array): FileTypeInfo {
  if (bytes.length < 5) {
    return { type: 'unknown' };
  }

  // ── PDF check ────────────────────────────────────────────
  const isPdf = PDF_MAGIC.every((b, i) => bytes[i] === b);
  if (isPdf) {
    // Extract version from header (e.g., "%PDF-1.7")
    let version: string | undefined;
    const headerSlice = bytes.slice(0, Math.min(bytes.length, 12));
    const headerStr = String.fromCharCode(...headerSlice);
    const match = headerStr.match(/%PDF-(\d+\.\d+)/);
    if (match) {
      version = match[1];
    }

    return {
      type: 'pdf',
      version,
      mimeType: 'application/pdf',
    };
  }

  // ── Unknown ──────────────────────────────────────────────
  return { type: 'unknown' };
}
