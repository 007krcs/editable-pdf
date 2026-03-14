import { describe, it, expect } from 'vitest';
import { validatePdfBytes, PDFSecurityError } from '../src/pdf-validator.js';

// Helper: create minimal valid PDF bytes
function createMinimalPdf(content = ''): Uint8Array {
  const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n${content}xref\n0 1\ntrailer\n<< /Root 1 0 R >>\nstartxref\n0\n%%EOF`;
  return new TextEncoder().encode(pdfContent);
}

describe('validatePdfBytes', () => {
  it('should accept a valid minimal PDF', () => {
    const pdf = createMinimalPdf();
    expect(() => validatePdfBytes(pdf)).not.toThrow();
  });

  it('should reject files without PDF header', () => {
    const notPdf = new TextEncoder().encode('This is not a PDF file');
    expect(() => validatePdfBytes(notPdf)).toThrow(PDFSecurityError);
    expect(() => validatePdfBytes(notPdf)).toThrow('missing %PDF- header');
  });

  it('should reject empty files', () => {
    expect(() => validatePdfBytes(new Uint8Array(0))).toThrow(PDFSecurityError);
    expect(() => validatePdfBytes(new Uint8Array(0))).toThrow('too small');
  });

  it('should reject files exceeding size limit', () => {
    // Create a valid PDF header + padding
    const header = new TextEncoder().encode('%PDF-1.4\n');
    const big = new Uint8Array(200);
    big.set(header);
    expect(() => validatePdfBytes(big, { maxFileSize: 100 })).toThrow(PDFSecurityError);
    expect(() => validatePdfBytes(big, { maxFileSize: 100 })).toThrow('exceeds maximum file size');
  });

  it('should accept files under size limit', () => {
    const pdf = createMinimalPdf();
    expect(() => validatePdfBytes(pdf, { maxFileSize: 10 * 1024 * 1024 })).not.toThrow();
  });

  it('should reject encrypted PDFs by default', () => {
    const pdf = createMinimalPdf('/Encrypt << /V 2 >>\n');
    expect(() => validatePdfBytes(pdf)).toThrow(PDFSecurityError);
    expect(() => validatePdfBytes(pdf)).toThrow('Encrypted');
  });

  it('should allow encrypted PDFs when configured', () => {
    const pdf = createMinimalPdf('/Encrypt << /V 2 >>\n');
    expect(() => validatePdfBytes(pdf, { allowEncrypted: true })).not.toThrow();
  });

  it('should reject PDFs with JavaScript by default', () => {
    const pdf = createMinimalPdf('/JS (app.alert("hello"))\n');
    expect(() => validatePdfBytes(pdf)).toThrow(PDFSecurityError);
    expect(() => validatePdfBytes(pdf)).toThrow('JavaScript');
  });

  it('should allow JavaScript when configured', () => {
    const pdf = createMinimalPdf('/JS (app.alert("hello"))\n');
    expect(() => validatePdfBytes(pdf, { allowJavaScript: true })).not.toThrow();
  });

  it('should reject PDFs with /JavaScript action', () => {
    const pdf = createMinimalPdf('/JavaScript << /Names [] >>\n');
    expect(() => validatePdfBytes(pdf)).toThrow(PDFSecurityError);
    expect(() => validatePdfBytes(pdf)).toThrow('JavaScript');
  });

  it('should handle PDF with BOM before header', () => {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    const pdfBytes = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< >>\nendobj\nxref\ntrailer\nstartxref\n0\n%%EOF');
    const combined = new Uint8Array(bom.length + pdfBytes.length);
    combined.set(bom);
    combined.set(pdfBytes, bom.length);
    expect(() => validatePdfBytes(combined)).not.toThrow();
  });

  it('should have correct error codes', () => {
    try {
      validatePdfBytes(new Uint8Array(0));
    } catch (err) {
      expect(err).toBeInstanceOf(PDFSecurityError);
      expect((err as PDFSecurityError).code).toBe('INVALID_HEADER');
    }

    try {
      const header = new TextEncoder().encode('%PDF-1.4\n');
      const big = new Uint8Array(200);
      big.set(header);
      validatePdfBytes(big, { maxFileSize: 100 });
    } catch (err) {
      expect((err as PDFSecurityError).code).toBe('FILE_TOO_LARGE');
    }
  });
});
