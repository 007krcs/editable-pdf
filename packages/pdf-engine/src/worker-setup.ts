import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

export function setupWorker(workerSrc?: string): void {
  if (workerInitialized) return;

  if (workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  } else if (typeof window !== 'undefined') {
    // Browser: use CDN worker matching the installed version
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  } else {
    // Node.js: disable worker (runs in main thread)
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }

  workerInitialized = true;
}

export function isWorkerInitialized(): boolean {
  return workerInitialized;
}
