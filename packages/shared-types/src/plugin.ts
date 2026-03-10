import type { DocSDKEventMap } from './events.js';
import type { DocumentState } from './document.js';

// ── Event emitter interface ─────────────────────────────────

/**
 * Strongly-typed event emitter.
 * All event names and payload types are enforced at compile time.
 */
export interface TypedEventEmitter<TMap> {
  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends keyof TMap>(event: K, listener: (payload: TMap[K]) => void): () => void;
  /** Subscribe to an event for a single emission only. */
  once<K extends keyof TMap>(event: K, listener: (payload: TMap[K]) => void): () => void;
  /** Remove a specific listener. */
  off<K extends keyof TMap>(event: K, listener: (payload: TMap[K]) => void): void;
  /** Emit an event to all current subscribers. */
  emit<K extends keyof TMap>(event: K, payload: TMap[K]): void;
  /** Remove all listeners for all events. */
  removeAllListeners(): void;
}

// ── Document controller interface ───────────────────────────

/**
 * Read-only view of the document controller exposed to plugins.
 * Plugins use this to inspect current document state and bytes.
 */
export interface DocumentControllerView {
  /** Current lifecycle state */
  readonly state: DocumentState;
  /** Raw bytes of the current document (null if IDLE) */
  readonly currentBytes: Uint8Array | null;
  /** Number of pages in the current document */
  readonly pageCount: number;
  /** Update the canonical bytes after a mutation (triggers MODIFIED state) */
  updateBytes(newBytes: Uint8Array): void;
  /** Update the known page count */
  setPageCount(count: number): void;
}

// ── Plugin interfaces ───────────────────────────────────────

/**
 * Context provided to every plugin during initialization.
 * Gives plugins access to the event bus, document state, and other plugins.
 */
export interface PluginContext {
  /** Typed event bus for subscribing and emitting */
  readonly events: TypedEventEmitter<DocSDKEventMap>;
  /** Read-only view of the document controller */
  readonly documentController: DocumentControllerView;
  /** Retrieve another registered plugin by name, or undefined if not found */
  getPlugin<T extends DocSDKPlugin>(name: string): T | undefined;
}

/**
 * Contract every DocSDK plugin must implement.
 * Plugins are initialized in registration order and destroyed in reverse order.
 */
export interface DocSDKPlugin {
  /** Unique plugin name (used for lookup via getPlugin) */
  readonly name: string;
  /** SemVer version string */
  readonly version: string;
  /** Called once during SDK initialization. Subscribe to events, discover peers. */
  initialize(context: PluginContext): void | Promise<void>;
  /** Called during SDK shutdown. Clean up subscriptions, timers, DOM references. */
  destroy(): void | Promise<void>;
}

// ── SDK interface ───────────────────────────────────────────

/**
 * Public interface returned by `createDocumentSDK()`.
 * Framework-agnostic entry point for all document operations.
 */
export interface DocumentSDK {
  /** Typed event bus for lifecycle and domain events */
  readonly events: TypedEventEmitter<DocSDKEventMap>;
  /** Current document lifecycle state */
  readonly state: DocumentState;
  /** Load a document from a file, URL, or buffer. Returns a document handle. */
  load(source: { readonly type: 'file'; readonly file: File }): Promise<import('./document.js').DocumentHandle>;
  load(source: { readonly type: 'url'; readonly url: string }): Promise<import('./document.js').DocumentHandle>;
  load(source: { readonly type: 'buffer'; readonly buffer: ArrayBuffer | Uint8Array }): Promise<import('./document.js').DocumentHandle>;
  load(source: import('./document.js').DocumentSource): Promise<import('./document.js').DocumentHandle>;
  /** Retrieve a registered plugin by name. Throws if not found. */
  getPlugin<T extends DocSDKPlugin>(name: string): T;
  /** Export the current document (with all mutations) as raw bytes. */
  export(): Promise<Uint8Array>;
  /** Close the document and release all resources. */
  close(): Promise<void>;
}
