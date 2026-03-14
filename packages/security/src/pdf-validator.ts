/**
 * Security validation errors for rejected PDFs.
 */
export class PDFSecurityError extends Error {
  override readonly name = 'PDFSecurityError' as const;

  constructor(
    message: string,
    public readonly code: PDFSecurityErrorCode,
  ) {
    super(message);
  }
}

export type PDFSecurityErrorCode =
  | 'INVALID_HEADER'
  | 'FILE_TOO_LARGE'
  | 'ENCRYPTED'
  | 'JAVASCRIPT_DETECTED'
  | 'SUSPICIOUS_STRUCTURE';

export interface PDFValidationConfig {
  /** Maximum file size in bytes (default: 100MB) */
  readonly maxFileSize?: number;
  /** Whether to allow encrypted PDFs (default: false) */
  readonly allowEncrypted?: boolean;
  /** Whether to allow PDFs with embedded JavaScript (default: false) */
  readonly allowJavaScript?: boolean;
  /** Maximum xref entries before flagging as suspicious (default: 500000) */
  readonly maxXrefEntries?: number;
}

const DEFAULT_CONFIG: Required<PDFValidationConfig> = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowEncrypted: false,
  allowJavaScript: false,
  maxXrefEntries: 500_000,
};

/** PDF magic bytes: %PDF- */
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

/**
 * Validate PDF bytes for security before processing.
 * Checks: magic bytes, file size, encryption, JavaScript, structural integrity.
 *
 * @throws {PDFSecurityError} if validation fails
 */
export function validatePdfBytes(
  bytes: Uint8Array,
  config: PDFValidationConfig = {},
): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 1. File size check
  if (bytes.length > cfg.maxFileSize) {
    throw new PDFSecurityError(
      `PDF exceeds maximum file size: ${(bytes.length / (1024 * 1024)).toFixed(1)}MB > ${(cfg.maxFileSize / (1024 * 1024)).toFixed(1)}MB`,
      'FILE_TOO_LARGE',
    );
  }

  // 2. Magic bytes check (%PDF-)
  if (bytes.length < 5) {
    throw new PDFSecurityError('File is too small to be a valid PDF', 'INVALID_HEADER');
  }

  // PDF header may have leading whitespace or BOM — search first 1024 bytes
  let headerFound = false;
  const searchLimit = Math.min(bytes.length, 1024);
  for (let i = 0; i <= searchLimit - 5; i++) {
    if (
      bytes[i] === PDF_MAGIC[0] &&
      bytes[i + 1] === PDF_MAGIC[1] &&
      bytes[i + 2] === PDF_MAGIC[2] &&
      bytes[i + 3] === PDF_MAGIC[3] &&
      bytes[i + 4] === PDF_MAGIC[4]
    ) {
      headerFound = true;
      break;
    }
  }
  if (!headerFound) {
    throw new PDFSecurityError('Invalid PDF: missing %PDF- header', 'INVALID_HEADER');
  }

  // For the remaining checks, convert a portion to string for pattern matching
  // Use Latin-1 decoding to safely handle binary content
  const textSample = bytesToLatin1(bytes, Math.min(bytes.length, 2 * 1024 * 1024));

  // 3. Encryption check
  if (!cfg.allowEncrypted) {
    // Look for /Encrypt dictionary entry in trailer
    if (/\/Encrypt\s/.test(textSample)) {
      throw new PDFSecurityError(
        'Encrypted PDFs are not allowed. Set allowEncrypted: true to permit them.',
        'ENCRYPTED',
      );
    }
  }

  // 4. JavaScript check
  if (!cfg.allowJavaScript) {
    // Check for /JS or /JavaScript actions
    if (/\/JS\s/.test(textSample) || /\/JavaScript\s/.test(textSample)) {
      throw new PDFSecurityError(
        'PDF contains embedded JavaScript, which is not allowed for security reasons.',
        'JAVASCRIPT_DETECTED',
      );
    }
  }

  // 5. Structural integrity — check xref entry count as zip-bomb heuristic
  const xrefMatches = textSample.match(/\bxref\b/g);
  if (xrefMatches && xrefMatches.length > 100) {
    throw new PDFSecurityError(
      'PDF has a suspiciously large number of cross-reference sections',
      'SUSPICIOUS_STRUCTURE',
    );
  }

  // Check for suspicious object count (zip bomb heuristic)
  const objMatches = textSample.match(/\d+\s+\d+\s+obj\b/g);
  if (objMatches && objMatches.length > cfg.maxXrefEntries) {
    throw new PDFSecurityError(
      `PDF contains ${objMatches.length} objects, exceeding the limit of ${cfg.maxXrefEntries}`,
      'SUSPICIOUS_STRUCTURE',
    );
  }
}

function bytesToLatin1(bytes: Uint8Array, maxLen: number): string {
  const len = Math.min(bytes.length, maxLen);
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, len))));
  }
  return chunks.join('');
}
