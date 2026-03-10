import { useCallback, useState, type RefObject } from 'react';

interface PDFViewerPanelProps {
  viewerRef: RefObject<HTMLDivElement | null>;
  onFileDrop: (file: File) => void;
}

export function PDFViewerPanel({ viewerRef, onFileDrop }: PDFViewerPanelProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type === 'application/pdf') {
        onFileDrop(file);
      }
    },
    [onFileDrop],
  );

  return (
    <div
      ref={viewerRef}
      className={`viewer-panel${dragOver ? ' drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOver && <div className="drop-zone-hint">Drop PDF here</div>}
    </div>
  );
}
