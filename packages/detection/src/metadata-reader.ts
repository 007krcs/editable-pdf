import type { DocumentMetadata } from '@docsdk/shared-types';

/**
 * Extract PDF metadata from raw document bytes.
 *
 * Uses lightweight text scanning to find the Info dictionary
 * and extract standard metadata fields. This avoids any dependency
 * on pdf-lib — enabling the detection package to remain standalone.
 *
 * Extracted fields: Title, Author, Subject, Creator, Producer,
 * CreationDate, ModDate, and page count (via `/Type /Page` occurrences).
 *
 * @param bytes - Raw PDF bytes
 * @returns Partial `DocumentMetadata` with whatever fields could be extracted
 */
export function readMetadata(bytes: Uint8Array): DocumentMetadata {
  const text = bytesToLatin1(bytes);
  const metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
    pageCount?: number;
  } = {};

  // ── Extract string fields from Info dictionary ─────────
  metadata.title = extractPdfString(text, '/Title');
  metadata.author = extractPdfString(text, '/Author');
  metadata.subject = extractPdfString(text, '/Subject');
  metadata.creator = extractPdfString(text, '/Creator');
  metadata.producer = extractPdfString(text, '/Producer');

  // ── Extract date fields ────────────────────────────────
  const creationDateStr = extractPdfString(text, '/CreationDate');
  if (creationDateStr) {
    const parsed = parsePdfDate(creationDateStr);
    if (parsed) metadata.creationDate = parsed;
  }

  const modDateStr = extractPdfString(text, '/ModDate');
  if (modDateStr) {
    const parsed = parsePdfDate(modDateStr);
    if (parsed) metadata.modificationDate = parsed;
  }

  // ── Count pages ────────────────────────────────────────
  // Look for /Type /Page (leaf page nodes, not /Pages)
  const pageMatches = text.match(/\/Type\s*\/Page(?!\s*s)/g);
  if (pageMatches) {
    metadata.pageCount = pageMatches.length;
  }

  return metadata as DocumentMetadata;
}

// ── Internal helpers ───────────────────────────────────────

/**
 * Convert raw bytes to a Latin-1 string for regex scanning.
 * Latin-1 preserves byte values 0-255, which is enough for PDF text parsing.
 */
function bytesToLatin1(bytes: Uint8Array): string {
  // Process in chunks to avoid call stack overflow with large files
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, bytes.length);
    chunks.push(String.fromCharCode(...bytes.slice(i, end)));
  }
  return chunks.join('');
}

/**
 * Extract a PDF string value for a given key from the document text.
 *
 * Handles both parenthesized strings `/Key (Value)` and
 * hex strings `/Key <48656C6C6F>`.
 *
 * @param text - The full PDF content as a Latin-1 string
 * @param key - The PDF key to search for (e.g., "/Title")
 * @returns The extracted string value, or undefined if not found
 */
function extractPdfString(text: string, key: string): string | undefined {
  // Pattern: /Key followed by a parenthesized string value.
  // Must handle escaped parens like \( and \) inside the string.
  // Matches: non-paren-non-backslash chars, OR escape sequences (\.),
  // repeated until the closing unescaped paren.
  const parenRegex = new RegExp(
    key.replace('/', '\\/') + '\\s*\\(([^()\\\\]*(?:\\\\.[^()\\\\]*)*)\\)',
  );
  const parenMatch = text.match(parenRegex);
  if (parenMatch) {
    return unescapePdfString(parenMatch[1]);
  }

  // Pattern: /Key followed by a hex string value
  const hexRegex = new RegExp(key.replace('/', '\\/') + '\\s*<([0-9A-Fa-f]*)>');
  const hexMatch = text.match(hexRegex);
  if (hexMatch) {
    return decodeHexString(hexMatch[1]);
  }

  return undefined;
}

/**
 * Unescape a PDF parenthesized string.
 * Handles common escape sequences: `\\`, `\(`, `\)`, `\n`, `\r`, `\t`.
 */
function unescapePdfString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

/**
 * Decode a PDF hex string (pairs of hex digits → characters).
 */
function decodeHexString(hex: string): string {
  const chars: string[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) {
    chars.push(String.fromCharCode(parseInt(hex.substring(i, i + 2), 16)));
  }
  return chars.join('');
}

/**
 * Parse a PDF date string into a JavaScript `Date`.
 *
 * PDF date format: `D:YYYYMMDDHHmmSSOHH'mm'`
 * - `D:` prefix (optional)
 * - YYYY = year, MM = month, DD = day
 * - HH = hour, mm = minute, SS = second
 * - O = timezone (+, -, or Z), HH'mm' = offset
 *
 * @param dateStr - The raw PDF date string
 * @returns A `Date` object, or `undefined` if parsing fails
 */
function parsePdfDate(dateStr: string): Date | undefined {
  // Strip "D:" prefix
  const str = dateStr.replace(/^D:/, '');

  // Match: YYYYMMDDHHmmSS with optional timezone
  const match = str.match(
    /^(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([+-Z])?(\d{2})?'?(\d{2})?'?$/,
  );
  if (!match) return undefined;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2] ?? '01', 10) - 1;
  const day = parseInt(match[3] ?? '01', 10);
  const hour = parseInt(match[4] ?? '00', 10);
  const minute = parseInt(match[5] ?? '00', 10);
  const second = parseInt(match[6] ?? '00', 10);

  const date = new Date(Date.UTC(year, month, day, hour, minute, second));

  // Apply timezone offset if present
  const tzSign = match[7];
  if (tzSign && tzSign !== 'Z') {
    const tzHours = parseInt(match[8] ?? '0', 10);
    const tzMinutes = parseInt(match[9] ?? '0', 10);
    const offsetMinutes = (tzSign === '+' ? -1 : 1) * (tzHours * 60 + tzMinutes);
    date.setUTCMinutes(date.getUTCMinutes() + offsetMinutes);
  }

  return date;
}
