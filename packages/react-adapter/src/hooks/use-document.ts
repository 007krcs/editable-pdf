import { useState, useCallback, useEffect } from 'react';
import { DocumentState, type DocumentSource } from '@docsdk/shared-types';
import { useDocSDK } from './use-docsdk.js';

export interface UseDocumentReturn {
  state: DocumentState;
  pageCount: number;
  error: Error | null;
  load: (source: DocumentSource) => Promise<void>;
  exportPdf: () => Promise<Uint8Array>;
  close: () => Promise<void>;
}

export function useDocument(): UseDocumentReturn {
  const sdk = useDocSDK();
  const [state, setState] = useState<DocumentState>(sdk.state);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubs = [
      sdk.events.on('document:loading', () => {
        setState(DocumentState.LOADING);
        setError(null);
      }),
      sdk.events.on('document:loaded', ({ pageCount: count }) => {
        setState(DocumentState.LOADED);
        setPageCount(count);
      }),
      sdk.events.on('document:error', ({ error: err }) => {
        setError(err);
      }),
      sdk.events.on('document:exporting', () => {
        setState(DocumentState.EXPORTING);
      }),
      sdk.events.on('document:exported', () => {
        setState(DocumentState.READY);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [sdk]);

  const load = useCallback(
    async (source: DocumentSource) => {
      setError(null);
      await sdk.load(source);
    },
    [sdk],
  );

  const exportPdf = useCallback(() => sdk.export(), [sdk]);
  const close = useCallback(() => sdk.close(), [sdk]);

  return { state, pageCount, error, load, exportPdf, close };
}
