import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export class PDFDocumentBridge {
  private pdfLibDoc: PDFDocument | null = null;
  private pdfjsDoc: PDFDocumentProxy | null = null;

  async initialize(bytes: Uint8Array): Promise<void> {
    await this.destroy();

    // Load with pdf-lib (mutable document)
    this.pdfLibDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

    // Load with pdfjs-dist (rendering)
    const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
    this.pdfjsDoc = await loadingTask.promise;
  }

  getPdfLibDocument(): PDFDocument {
    if (!this.pdfLibDoc) {
      throw new Error('PDFDocumentBridge not initialized. Call initialize() first.');
    }
    return this.pdfLibDoc;
  }

  getPdfjsDocument(): PDFDocumentProxy {
    if (!this.pdfjsDoc) {
      throw new Error('PDFDocumentBridge not initialized. Call initialize() first.');
    }
    return this.pdfjsDoc;
  }

  getPageCount(): number {
    if (this.pdfjsDoc) return this.pdfjsDoc.numPages;
    if (this.pdfLibDoc) return this.pdfLibDoc.getPageCount();
    return 0;
  }

  async reserialize(): Promise<Uint8Array> {
    if (!this.pdfLibDoc) {
      throw new Error('No pdf-lib document to serialize');
    }

    // Save modified document to bytes
    const newBytes = await this.pdfLibDoc.save();
    const bytes = new Uint8Array(newBytes);

    // Destroy old pdfjs document and reparse
    if (this.pdfjsDoc) {
      await this.pdfjsDoc.destroy();
    }
    const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
    this.pdfjsDoc = await loadingTask.promise;

    // Reload pdf-lib document with fresh bytes so both are in sync
    this.pdfLibDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

    return bytes;
  }

  async destroy(): Promise<void> {
    if (this.pdfjsDoc) {
      await this.pdfjsDoc.destroy();
      this.pdfjsDoc = null;
    }
    this.pdfLibDoc = null;
  }
}
