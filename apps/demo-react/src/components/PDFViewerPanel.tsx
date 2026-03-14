import { useCallback, useState, type RefObject } from 'react';
import { SIGNATURE_DRAG_TYPE } from './SignatureMode.js';

export interface SignatureDropInfo {
  pageNumber: number;
  x: number;
  y: number;
}

interface PDFViewerPanelProps {
  viewerRef: RefObject<HTMLDivElement | null>;
  onFileDrop: (file: File) => void;
  onSignatureDrop?: (info: SignatureDropInfo) => void;
}

export function PDFViewerPanel({ viewerRef, onFileDrop, onSignatureDrop }: PDFViewerPanelProps) {
  const [dragOver, setDragOver] = useState(false);
  const [dragType, setDragType] = useState<'pdf' | 'signature' | null>(null);

  const getDragType = useCallback((e: React.DragEvent): 'signature' | 'pdf' | null => {
    if (e.dataTransfer.types.includes(SIGNATURE_DRAG_TYPE)) {
      return 'signature';
    }
    if (e.dataTransfer.types.includes('Files')) {
      return 'pdf';
    }
    return null;
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = getDragType(e);
      setDragType(type);
      setDragOver(true);

      // Set the drop effect based on drag type
      e.dataTransfer.dropEffect = type === 'signature' ? 'copy' : 'copy';
    },
    [getDragType],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear state when truly leaving the viewer panel
    // (not when entering a child element like a canvas)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget && viewerRef.current?.contains(relatedTarget)) {
      return;
    }
    setDragOver(false);
    setDragType(null);
  }, [viewerRef]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      setDragType(null);

      // ── Signature drop ──────────────────────────────────────
      if (e.dataTransfer.types.includes(SIGNATURE_DRAG_TYPE) && onSignatureDrop) {
        // Find which canvas is under the cursor
        const dropX = e.clientX;
        const dropY = e.clientY;

        const canvases = viewerRef.current?.querySelectorAll('canvas[data-page]');
        if (!canvases) return;

        for (const canvas of canvases) {
          const rect = canvas.getBoundingClientRect();
          if (
            dropX >= rect.left &&
            dropX <= rect.right &&
            dropY >= rect.top &&
            dropY <= rect.bottom
          ) {
            const pageNumber = Number(canvas.getAttribute('data-page'));
            const x = dropX - rect.left;
            const y = dropY - rect.top;

            onSignatureDrop({ pageNumber, x, y });
            return;
          }
        }
        return;
      }

      // ── PDF file drop ───────────────────────────────────────
      const file = e.dataTransfer.files[0];
      if (file?.type === 'application/pdf') {
        onFileDrop(file);
      }
    },
    [onFileDrop, onSignatureDrop, viewerRef],
  );

  const isSignatureDrag = dragOver && dragType === 'signature';
  const isPdfDrag = dragOver && dragType === 'pdf';

  return (
    <div
      ref={viewerRef}
      className={[
        'viewer-panel',
        isPdfDrag ? 'drag-over' : '',
        isSignatureDrag ? 'signature-drag-over' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isPdfDrag && <div className="drop-zone-hint">Drop PDF here</div>}
      {isSignatureDrag && (
        <div className="drop-zone-hint signature-drop-hint">
          Drop signature on a page
        </div>
      )}
    </div>
  );
}
