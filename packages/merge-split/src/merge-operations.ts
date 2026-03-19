import { PDFDocument } from 'pdf-lib';

export async function mergePdfs(pdfBytesList: Uint8Array[]): Promise<Uint8Array> {
  if (pdfBytesList.length === 0) throw new Error('At least one PDF is required');

  const merged = await PDFDocument.create();

  for (const bytes of pdfBytesList) {
    const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const indices = srcDoc.getPageIndices();
    const copiedPages = await merged.copyPages(srcDoc, indices);
    for (const page of copiedPages) {
      merged.addPage(page);
    }
  }

  return new Uint8Array(await merged.save());
}

export async function splitPdf(bytes: Uint8Array, ranges: Array<{ start: number; end: number }>): Promise<Uint8Array[]> {
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const results: Uint8Array[] = [];

  for (const range of ranges) {
    const newDoc = await PDFDocument.create();
    const indices: number[] = [];
    for (let i = range.start - 1; i < range.end && i < srcDoc.getPageCount(); i++) {
      indices.push(i);
    }
    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    for (const page of copiedPages) {
      newDoc.addPage(page);
    }
    results.push(new Uint8Array(await newDoc.save()));
  }

  return results;
}

export async function extractPages(bytes: Uint8Array, pageNumbers: number[]): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();
  const indices = pageNumbers.map((p) => p - 1);
  const copiedPages = await newDoc.copyPages(srcDoc, indices);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }
  return new Uint8Array(await newDoc.save());
}
