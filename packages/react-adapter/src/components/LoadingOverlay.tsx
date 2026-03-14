import type { CSSProperties, ReactNode } from 'react';

export interface LoadingOverlayProps {
  /** Whether to show the overlay */
  visible: boolean;
  /** Progress percentage (0-100). If undefined, shows indeterminate spinner. */
  progress?: number;
  /** Loading message */
  message?: string;
  /** Custom content to render inside the overlay */
  children?: ReactNode;
  /** Custom styles for the overlay container */
  style?: CSSProperties;
}

/**
 * Full-screen loading overlay with optional progress bar.
 */
export function LoadingOverlay({
  visible,
  progress,
  message = 'Loading...',
  children,
  style,
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.85)',
        zIndex: 10,
        gap: 12,
        ...style,
      }}
    >
      {children ?? (
        <>
          <div style={{ fontSize: 14, color: '#666' }}>{message}</div>
          {progress !== undefined && (
            <div
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${Math.round(progress)}% complete`}
              style={{
                width: 200,
                height: 4,
                background: '#e0e0e0',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                  height: '100%',
                  background: '#2563eb',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
