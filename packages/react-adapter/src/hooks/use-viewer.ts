import { useState, useCallback, useEffect, useRef, type RefObject } from 'react';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';
import { invalidateRenderCache } from '@docsdk/pdf-engine';
import { useDocSDK } from './use-docsdk.js';

export interface UseViewerReturn {
  scale: number;
  setScale: (scale: number) => void;
  currentPage: number;
  goToPage: (page: number) => void;
  pageCount: number;
}

/**
 * Intersection-observer based viewer hook.
 *
 * Instead of rendering ALL pages at once, it:
 * 1. Creates placeholder divs for every page
 * 2. Uses IntersectionObserver to detect which pages are near the viewport
 * 3. Only renders pages that are visible or within a 1-page buffer
 *
 * This keeps DOM/memory usage low for large documents.
 */
export function useViewer(
  containerRef: RefObject<HTMLDivElement | null>,
  initialScale = 1.0,
): UseViewerReturn {
  const sdk = useDocSDK();
  const [scale, setScale] = useState(initialScale);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const renderedPages = useRef(new Set<number>());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const unsub = sdk.events.on('document:loaded', ({ pageCount: count }) => {
      setPageCount(count);
      setCurrentPage(1);
    });
    return unsub;
  }, [sdk]);

  // Create placeholders and set up intersection observer for lazy rendering
  useEffect(() => {
    if (pageCount === 0 || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';
    renderedPages.current.clear();

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    let pdfEngine: PDFEnginePlugin | null = null;
    try {
      pdfEngine = sdk.getPlugin<PDFEnginePlugin>('pdf-engine');
    } catch {
      return;
    }

    const engine = pdfEngine;

    // Create placeholder divs for all pages
    const placeholders: HTMLDivElement[] = [];
    for (let i = 1; i <= pageCount; i++) {
      const placeholder = document.createElement('div');
      placeholder.dataset.page = String(i);
      placeholder.style.display = 'flex';
      placeholder.style.alignItems = 'center';
      placeholder.style.justifyContent = 'center';
      placeholder.style.margin = '8px auto';
      placeholder.style.minHeight = '400px';
      placeholder.style.width = 'fit-content';
      placeholder.style.background = '#fff';
      placeholder.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      placeholder.setAttribute('role', 'img');
      placeholder.setAttribute('aria-label', `Page ${i} of ${pageCount}`);
      container.appendChild(placeholder);
      placeholders.push(placeholder);
    }

    // Render (or re-render) a specific page into its placeholder
    const renderPageIntoPlaceholder = async (pageNum: number, force = false) => {
      if (!force && renderedPages.current.has(pageNum)) return;
      renderedPages.current.add(pageNum);

      const placeholder = placeholders[pageNum - 1];
      if (!placeholder) return;

      // Reuse existing canvas or create new one
      let canvas = placeholder.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.style.display = 'block';
        canvas.dataset.page = String(pageNum);
        placeholder.innerHTML = '';
        placeholder.appendChild(canvas);
      }

      try {
        await engine.renderPage(pageNum, canvas, { scale });
        placeholder.style.minHeight = '';
      } catch {
        placeholder.textContent = `Failed to render page ${pageNum}`;
      }
    };

    // Set up IntersectionObserver with a generous rootMargin (1 viewport buffer)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = Number(
              (entry.target as HTMLElement).dataset.page,
            );
            if (pageNum > 0) {
              renderPageIntoPlaceholder(pageNum);
            }
          }
        }
      },
      {
        root: container,
        rootMargin: '100% 0px', // 1 full viewport above and below
      },
    );

    observerRef.current = observer;

    for (const placeholder of placeholders) {
      observer.observe(placeholder);
    }

    // ── Real-time re-render on document mutations ──────────
    // When a signature is placed, invalidate cache and re-render the affected page
    const unsubSignature = sdk.events.on('signature:placed', ({ pageNumber }) => {
      invalidateRenderCache();
      renderPageIntoPlaceholder(pageNumber, true);
    });

    return () => {
      observer.disconnect();
      unsubSignature();
    };
  }, [sdk, pageCount, scale, containerRef]);

  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > pageCount) return;
      setCurrentPage(page);
      const container = containerRef.current;
      if (container) {
        const target = container.querySelector(`[data-page="${page}"]`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [pageCount, containerRef],
  );

  return { scale, setScale, currentPage, goToPage, pageCount };
}
