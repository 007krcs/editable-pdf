import { describe, it, expect } from 'vitest';
import { detectFileType } from '../src/file-type-detector.js';

describe('detectFileType', () => {
  it('should detect PDF 1.7 from magic bytes', () => {
    // %PDF-1.7
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const result = detectFileType(bytes);
    expect(result.type).toBe('pdf');
    expect(result.version).toBe('1.7');
    expect(result.mimeType).toBe('application/pdf');
  });

  it('should detect PDF version 2.0', () => {
    const header = '%PDF-2.0';
    const bytes = new Uint8Array([...header].map((c) => c.charCodeAt(0)));
    const result = detectFileType(bytes);
    expect(result.type).toBe('pdf');
    expect(result.version).toBe('2.0');
  });

  it('should detect PDF version 1.4', () => {
    const header = '%PDF-1.4';
    const bytes = new Uint8Array([...header].map((c) => c.charCodeAt(0)));
    const result = detectFileType(bytes);
    expect(result.type).toBe('pdf');
    expect(result.version).toBe('1.4');
  });

  it('should detect PDF with no version after magic bytes', () => {
    // %PDF- followed by non-version characters
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x00, 0x00]);
    const result = detectFileType(bytes);
    expect(result.type).toBe('pdf');
    expect(result.version).toBeUndefined();
    expect(result.mimeType).toBe('application/pdf');
  });

  it('should return unknown for non-PDF bytes', () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
    const result = detectFileType(bytes);
    expect(result.type).toBe('unknown');
    expect(result.version).toBeUndefined();
    expect(result.mimeType).toBeUndefined();
  });

  it('should return unknown for too-short input', () => {
    const bytes = new Uint8Array([0x25, 0x50]);
    const result = detectFileType(bytes);
    expect(result.type).toBe('unknown');
  });

  it('should return unknown for empty input', () => {
    const bytes = new Uint8Array([]);
    const result = detectFileType(bytes);
    expect(result.type).toBe('unknown');
  });
});
