import { useRef, type CSSProperties } from 'react';
import { useViewer } from '../hooks/use-viewer.js';

export interface PDFViewerProps {
  scale?: number;
  style?: CSSProperties;
  className?: string;
}

export function PDFViewer({ scale: initialScale = 1.0, style, className }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scale, setScale, pageCount } = useViewer(containerRef, initialScale);

  return (
    <div
      ref={containerRef}
      role="document"
      aria-label="PDF Document Viewer"
      aria-live="polite"
      tabIndex={0}
      style={{
        overflow: 'auto',
        background: '#f0f0f0',
        ...style,
      }}
      className={className}
    />
  );
}
