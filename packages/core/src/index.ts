// ── Factory ─────────────────────────────────────────────────
export { createDocumentSDK } from './docsdk.js';
export type { DocSDKConfig } from './docsdk.js';

// ── Internal building blocks (for engine/plugin packages) ──
export { DocumentController } from './document-controller.js';
export { EventBus } from './event-bus.js';
export { PluginRegistry } from './plugin-registry.js';

// ── Error classes ───────────────────────────────────────────
export {
  InvalidStateError,
  PluginNotFoundError,
  DocumentLoadError,
  DuplicatePluginError,
} from './errors.js';
