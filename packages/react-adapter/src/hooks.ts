// Dedicated hooks-only entry point for Fast Refresh compatibility.
// Import from '@docsdk/react-adapter/hooks' to avoid mixed-export warnings.
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
