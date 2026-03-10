import type { CSSProperties } from 'react';
import { usePage } from '../hooks/use-page.js';

export interface PDFPageProps {
  pageNumber: number;
  scale?: number;
  style?: CSSProperties;
  className?: string;
}

export function PDFPage({ pageNumber, scale = 1.0, style, className }: PDFPageProps) {
  const { canvasRef, isRendering, error } = usePage(pageNumber, scale);

  return (
    <div style={{ position: 'relative', ...style }} className={className}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {isRendering && (
        <div
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
        <div style={{ color: 'red', padding: 8 }}>
          Error rendering page {pageNumber}: {error.message}
        </div>
      )}
    </div>
  );
}
