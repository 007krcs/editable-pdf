import { Component, type ReactNode, type ErrorInfo } from 'react';

export interface ErrorBoundaryProps {
  /** Content to render when no error has occurred */
  children: ReactNode;
  /** Custom fallback UI. Receives the error and a retry function. */
  fallback?: (error: Error, retry: () => void) => ReactNode;
  /** Called when an error is caught. Use for logging/telemetry. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * React error boundary that catches rendering errors in its subtree.
 * Prevents a single component crash from taking down the entire app.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={(err, retry) => <ErrorFallback error={err} onRetry={retry} />}>
 *   <PDFViewer />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }
      return <DefaultErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

// ── Default fallback ──────────────────────────────────────

function DefaultErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div
      role="alert"
      style={{
        padding: '16px',
        margin: '8px',
        borderRadius: '8px',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h4 style={{ margin: '0 0 8px', color: '#dc2626', fontSize: '14px' }}>
        Something went wrong
      </h4>
      <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#666' }}>
        {error.message}
      </p>
      <button
        onClick={onRetry}
        style={{
          padding: '6px 14px',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          background: 'white',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        Try Again
      </button>
    </div>
  );
}
