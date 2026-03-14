import type { DocumentSource } from '@docsdk/shared-types';
import { DocumentLoadError } from '@docsdk/core';

export interface LoaderConfig {
  /** Maximum number of retry attempts for URL sources (default: 3) */
  readonly maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  readonly retryBaseDelay?: number;
}

const DEFAULT_LOADER_CONFIG: Required<LoaderConfig> = {
  maxRetries: 3,
  retryBaseDelay: 1000,
};

export async function loadPdfBytes(
  source: DocumentSource,
  config: LoaderConfig = {},
): Promise<Uint8Array> {
  switch (source.type) {
    case 'buffer': {
      const buf = source.buffer;
      if (buf instanceof Uint8Array) return buf;
      return new Uint8Array(buf);
    }
    case 'url': {
      const cfg = { ...DEFAULT_LOADER_CONFIG, ...config };
      return fetchWithRetry(source.url, cfg.maxRetries, cfg.retryBaseDelay);
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

async function fetchWithRetry(
  url: string,
  maxRetries: number,
  baseDelay: number,
): Promise<Uint8Array> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        // Don't retry 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          throw new DocumentLoadError(
            `Failed to fetch PDF: ${response.status} ${response.statusText}`,
          );
        }
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (err) {
      if (err instanceof DocumentLoadError) throw err;
      lastError = err;

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, ...
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw new DocumentLoadError(
    `Failed to fetch PDF from URL after ${maxRetries + 1} attempts: ${url}`,
    lastError,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
