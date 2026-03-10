import { useState, useEffect } from 'react';
import type { FileTypeInfo, DocumentMetadata } from '@docsdk/shared-types';
import { useDocSDK } from './use-docsdk.js';

export interface UseDetectionReturn {
  fileType: FileTypeInfo | null;
  metadata: DocumentMetadata | null;
}

export function useDetection(): UseDetectionReturn {
  const sdk = useDocSDK();
  const [fileType, setFileType] = useState<FileTypeInfo | null>(null);
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null);

  useEffect(() => {
    const unsub = sdk.events.on('document:detected', (data) => {
      setFileType(data.fileType);
      setMetadata(data.metadata);
    });

    const unsubClose = sdk.events.on('document:closed', () => {
      setFileType(null);
      setMetadata(null);
    });

    return () => {
      unsub();
      unsubClose();
    };
  }, [sdk]);

  return { fileType, metadata };
}
