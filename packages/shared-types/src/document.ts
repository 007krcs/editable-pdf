/**
 * The source from which a document is loaded.
 * Discriminated union on the `type` field.
 */
export type DocumentSource =
  | { readonly type: 'file'; readonly file: File }
  | { readonly type: 'url'; readonly url: string }
  | { readonly type: 'buffer'; readonly buffer: ArrayBuffer | Uint8Array };

/**
 * Finite state machine states for document lifecycle.
 *
 * Transitions:
 *   IDLE -> LOADING -> LOADED -> RENDERING -> READY
 *                                               |-> MODIFIED -> LOADED (reserialize)
 *                                               |-> EXPORTING -> READY
 *   Any state -> IDLE (close/reset)
 */
export enum DocumentState {
  /** No document loaded */
  IDLE = 'IDLE',
  /** Document bytes are being fetched/read */
  LOADING = 'LOADING',
  /** Document bytes parsed, ready to render */
  LOADED = 'LOADED',
  /** A page is being rendered to canvas */
  RENDERING = 'RENDERING',
  /** Document is rendered and interactive */
  READY = 'READY',
  /** Document has been mutated since last render */
  MODIFIED = 'MODIFIED',
  /** Document is being serialized for export */
  EXPORTING = 'EXPORTING',
}

/**
 * Immutable handle to a loaded document.
 * Returned from `sdk.load()`. Represents a snapshot
 * of document identity at load time.
 */
export interface DocumentHandle {
  /** Unique identifier for this load session */
  readonly id: string;
  /** Number of pages in the document */
  readonly pageCount: number;
  /** Raw bytes of the document at load time */
  readonly bytes: Uint8Array;
  /** MIME type if known (e.g. 'application/pdf') */
  readonly mimeType: string | undefined;
}
