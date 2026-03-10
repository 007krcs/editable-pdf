import { useRef, useState, useEffect } from 'react';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';
import { DocumentState } from '@docsdk/shared-types';
import { useDocSDK } from './use-docsdk.js';

export interface UsePageReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isRendering: boolean;
  error: Error | null;
}

export function usePage(pageNumber: number, scale = 1.0): UsePageReturn {
  const sdk = useDocSDK();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pageNumber < 1) return;

    let cancelled = false;

    const render = async () => {
      setIsRendering(true);
      setError(null);
      try {
        const pdfEngine = sdk.getPlugin<PDFEnginePlugin>('pdf-engine');
        if (!cancelled) {
          await pdfEngine.renderPage(pageNumber, canvas, { scale });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    };

    const unsub = sdk.events.on('document:loaded', () => {
      render();
    });

    // Also render if document is already loaded
    if (sdk.state !== DocumentState.IDLE && sdk.state !== DocumentState.LOADING) {
      render();
    }

    return () => {
      cancelled = true;
      unsub();
    };
  }, [sdk, pageNumber, scale]);

  return { canvasRef, isRendering, error };
}
