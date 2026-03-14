import type { CSSProperties } from 'react';
import { usePage } from '../hooks/use-page.js';

export interface PDFPageProps {
  pageNumber: number;
  totalPages?: number;
  scale?: number;
  style?: CSSProperties;
  className?: string;
}

export function PDFPage({ pageNumber, totalPages, scale = 1.0, style, className }: PDFPageProps) {
  const { canvasRef, isRendering, error } = usePage(pageNumber, scale);

  return (
    <div role="img" aria-label={`Page ${pageNumber}${totalPages ? ` of ${totalPages}` : ''}`} style={{ position: 'relative', ...style }} className={className}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {isRendering && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.7)',
          }}
        >
          Loading...
        </div>
      )}
      {error && (
        <div role="alert" style={{ color: 'red', padding: 8 }}>
          Error rendering page {pageNumber}: {error.message}
        </div>
      )}
    </div>
  );
}
