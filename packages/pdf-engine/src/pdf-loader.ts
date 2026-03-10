import type { DocumentSource } from '@docsdk/shared-types';
import { DocumentLoadError } from '@docsdk/core';

export async function loadPdfBytes(source: DocumentSource): Promise<Uint8Array> {
  switch (source.type) {
    case 'buffer': {
      const buf = source.buffer;
      if (buf instanceof Uint8Array) return buf;
      return new Uint8Array(buf);
    }
    case 'url': {
      try {
        const response = await fetch(source.url);
        if (!response.ok) {
          throw new DocumentLoadError(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch (err) {
        if (err instanceof DocumentLoadError) throw err;
        throw new DocumentLoadError(`Failed to fetch PDF from URL: ${source.url}`, err);
      }
    }
    case 'file': {
      return new Promise<Uint8Array>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(new Uint8Array(reader.result));
          } else {
            reject(new DocumentLoadError('FileReader did not return an ArrayBuffer'));
          }
        };
        reader.onerror = () => {
          reject(new DocumentLoadError('Failed to read file', reader.error));
        };
        reader.readAsArrayBuffer(source.file);
      });
    }
    default:
      throw new DocumentLoadError(`Unknown document source type`);
  }
}
