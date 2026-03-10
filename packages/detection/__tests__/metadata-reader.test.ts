import { describe, it, expect } from 'vitest';
import { readMetadata } from '../src/metadata-reader.js';

/**
 * Helper: create a minimal valid PDF with an Info dictionary.
 * The PDF spec is complex, but metadata extraction only needs
 * to find /Title, /Author, etc. in the raw bytes.
 */
function buildPdfWithInfo(infoEntries: string, pageCount = 1): Uint8Array {
  const pages = Array.from(
    { length: pageCount },
    () => `
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj`,
  ).join('\n');

  const pdfContent = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count ${pageCount} >>
endobj
${pages}
4 0 obj
<< ${infoEntries} >>
endobj
trailer
<< /Root 1 0 R /Info 4 0 R >>
%%EOF`;

  return new Uint8Array([...pdfContent].map((c) => c.charCodeAt(0)));
}

describe('readMetadata', () => {
  it('should extract title from Info dictionary', () => {
    const pdf = buildPdfWithInfo('/Title (My Document)');
    const metadata = readMetadata(pdf);
    expect(metadata.title).toBe('My Document');
  });

  it('should extract author from Info dictionary', () => {
    const pdf = buildPdfWithInfo('/Author (Jane Doe)');
    const metadata = readMetadata(pdf);
    expect(metadata.author).toBe('Jane Doe');
  });

  it('should extract subject from Info dictionary', () => {
    const pdf = buildPdfWithInfo('/Subject (Test Subject)');
    const metadata = readMetadata(pdf);
    expect(metadata.subject).toBe('Test Subject');
  });

  it('should extract creator and producer', () => {
    const pdf = buildPdfWithInfo('/Creator (TestApp) /Producer (LibPDF)');
    const metadata = readMetadata(pdf);
    expect(metadata.creator).toBe('TestApp');
    expect(metadata.producer).toBe('LibPDF');
  });

  it('should extract multiple fields simultaneously', () => {
    const pdf = buildPdfWithInfo(
      '/Title (Report) /Author (Alice) /Subject (Q4 Analysis) /Creator (DocGen)',
    );
    const metadata = readMetadata(pdf);
    expect(metadata.title).toBe('Report');
    expect(metadata.author).toBe('Alice');
    expect(metadata.subject).toBe('Q4 Analysis');
    expect(metadata.creator).toBe('DocGen');
  });

  it('should parse a PDF date string for CreationDate', () => {
    const pdf = buildPdfWithInfo('/CreationDate (D:20240115120000Z)');
    const metadata = readMetadata(pdf);
    expect(metadata.creationDate).toBeInstanceOf(Date);
    expect(metadata.creationDate!.getUTCFullYear()).toBe(2024);
    expect(metadata.creationDate!.getUTCMonth()).toBe(0); // January
    expect(metadata.creationDate!.getUTCDate()).toBe(15);
  });

  it('should parse ModDate', () => {
    const pdf = buildPdfWithInfo('/ModDate (D:20250301093000+05)');
    const metadata = readMetadata(pdf);
    expect(metadata.modificationDate).toBeInstanceOf(Date);
  });

  it('should count pages via /Type /Page occurrences', () => {
    const pdf = buildPdfWithInfo('/Title (Multi-page)', 3);
    const metadata = readMetadata(pdf);
    expect(metadata.pageCount).toBe(3);
  });

  it('should return empty metadata for non-PDF content', () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    const metadata = readMetadata(bytes);
    expect(metadata.title).toBeUndefined();
    expect(metadata.author).toBeUndefined();
    expect(metadata.pageCount).toBeUndefined();
  });

  it('should handle escaped parentheses in strings', () => {
    const pdf = buildPdfWithInfo('/Title (Hello \\(World\\))');
    const metadata = readMetadata(pdf);
    expect(metadata.title).toBe('Hello (World)');
  });

  it('should handle hex string values', () => {
    // /Title <48656C6C6F> → "Hello"
    const pdf = buildPdfWithInfo('/Title <48656C6C6F>');
    const metadata = readMetadata(pdf);
    expect(metadata.title).toBe('Hello');
  });
});
