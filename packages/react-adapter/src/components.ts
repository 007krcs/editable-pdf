// Dedicated components-only entry point for Fast Refresh compatibility.
// Import from '@docsdk/react-adapter/components' to avoid mixed-export warnings.
export { DocSDKProvider } from './context.js';
export type { DocSDKProviderProps } from './context.js';
export {
  PDFViewer,
  PDFPage,
  FormFieldOverlay,
  SignaturePad,
  ErrorBoundary,
  LoadingOverlay,
  ThemeProvider,
} from './components/index.js';
export type {
  PDFViewerProps,
  PDFPageProps,
  FormFieldOverlayProps,
  SignaturePadProps,
  ErrorBoundaryProps,
  LoadingOverlayProps,
  ThemeProviderProps,
} from './components/index.js';
