// ── Components (only PascalCase React component exports) ────
export { DocSDKProvider } from './context.js';
export type { DocSDKProviderProps } from './context.js';
export {
  PDFViewer,
  PDFPage,
  FormFieldOverlay,
  SignaturePad,
} from './components/index.js';
export type {
  PDFViewerProps,
  PDFPageProps,
  FormFieldOverlayProps,
  SignaturePadProps,
} from './components/index.js';

// ── Hooks (only camelCase hook exports) ─────────────────────
export {
  useDocSDK,
  useDocument,
  useFormFields,
  useViewer,
  usePage,
  useValidation,
  useScreenshot,
  useDetection,
} from './hooks/index.js';
export type {
  UseDocumentReturn,
  UseFormFieldsReturn,
  UseViewerReturn,
  UsePageReturn,
  UseValidationReturn,
  UseScreenshotReturn,
  UseDetectionReturn,
} from './hooks/index.js';
