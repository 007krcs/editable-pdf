import { useState, useCallback, useEffect, type RefObject } from 'react';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';
import { useDocSDK } from './use-docsdk.js';

export interface UseViewerReturn {
  scale: number;
  setScale: (scale: number) => void;
  currentPage: number;
  goToPage: (page: number) => void;
  pageCount: number;
}

export function useViewer(
  containerRef: RefObject<HTMLDivElement | null>,
  initialScale = 1.0,
): UseViewerReturn {
  const sdk = useDocSDK();
  const [scale, setScale] = useState(initialScale);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    const unsub = sdk.events.on('document:loaded', ({ pageCount: count }) => {
      setPageCount(count);
      setCurrentPage(1);
    });
    return unsub;
  }, [sdk]);

  // Render pages when document loaded or scale changes
  useEffect(() => {
    if (pageCount === 0 || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';

    const renderPages = async () => {
      try {
        const pdfEngine = sdk.getPlugin<PDFEnginePlugin>('pdf-engine');
        for (let i = 1; i <= pageCount; i++) {
          const canvas = document.createElement('canvas');
          canvas.style.display = 'block';
          canvas.style.margin = '8px auto';
          canvas.dataset.page = String(i);
          container.appendChild(canvas);
          await pdfEngine.renderPage(i, canvas, { scale });
        }
      } catch {
        // PDF engine not available
      }
    };

    renderPages();
  }, [sdk, pageCount, scale, containerRef]);

  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > pageCount) return;
      setCurrentPage(page);
      const container = containerRef.current;
      if (container) {
        const canvas = container.querySelector(`canvas[data-page="${page}"]`);
        canvas?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [pageCount, containerRef],
  );

  return { scale, setScale, currentPage, goToPage, pageCount };
}
