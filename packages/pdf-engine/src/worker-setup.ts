import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

/**
 * Configure the PDF.js worker.
 *
 * Resolution order:
 * 1. Explicit `workerSrc` argument (highest priority)
 * 2. Local worker from `pdfjs-dist/build/pdf.worker.min.mjs` (bundler-resolved)
 * 3. Fallback to CDN (last resort for environments where local resolution fails)
 * 4. Empty string for Node.js (runs on main thread)
 */
export function setupWorker(workerSrc?: string): void {
  if (workerInitialized) return;

  if (workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  } else if (typeof window !== 'undefined') {
    // Browser: try to resolve the local worker bundled with pdfjs-dist.
    // This avoids a runtime CDN dependency and works offline.
    try {
      // Modern bundlers (Vite, Webpack 5, esbuild) can resolve this
      // via new URL(..., import.meta.url)
      const workerUrl = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).href;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    } catch {
      // Fallback: CDN matching the installed version
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    }
  } else {
    // Node.js: disable worker (runs in main thread)
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }

  workerInitialized = true;
}

export function isWorkerInitialized(): boolean {
  return workerInitialized;
}

/**
 * Reset the worker initialization state.
 * Useful for testing or reconfiguring the worker at runtime.
 */
export function resetWorker(): void {
  workerInitialized = false;
}
