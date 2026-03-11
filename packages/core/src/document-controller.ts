import {
  DocumentState,
  type DocumentSource,
  type DocumentHandle,
  type DocSDKEventMap,
  type DocumentControllerView,
  type TypedEventEmitter,
  type CanvasTarget,
} from '@docsdk/shared-types';
import { InvalidStateError, DocumentLoadError } from './errors.js';

/** Monotonically increasing document id counter */
let nextId = 0;

/**
 * Allowed state transitions for the document lifecycle FSM.
 *
 * IDLE → LOADING → LOADED → RENDERING → READY → MODIFIED → LOADED (reserialize)
 *                                            ↘ EXPORTING → READY
 *                                        Any → IDLE (close/reset)
 */
const VALID_TRANSITIONS: Readonly<Record<DocumentState, readonly DocumentState[]>> = {
  [DocumentState.IDLE]: [DocumentState.LOADING],
  [DocumentState.LOADING]: [DocumentState.LOADED, DocumentState.IDLE],
  [DocumentState.LOADED]: [DocumentState.RENDERING, DocumentState.EXPORTING, DocumentState.IDLE],
  [DocumentState.RENDERING]: [DocumentState.READY, DocumentState.LOADED],
  [DocumentState.READY]: [
    DocumentState.MODIFIED,
    DocumentState.RENDERING,
    DocumentState.EXPORTING,
    DocumentState.IDLE,
  ],
  [DocumentState.MODIFIED]: [DocumentState.LOADED, DocumentState.EXPORTING, DocumentState.IDLE],
  [DocumentState.EXPORTING]: [DocumentState.READY, DocumentState.LOADED],
};

/**
 * Manages document lifecycle state, canonical bytes, and emits lifecycle events.
 *
 * v2 improvements:
 * - Operation lock prevents concurrent load/export races
 * - AbortSignal support for cancellable operations
 * - Atomic updateBytes only in valid states
 */
export class DocumentController implements DocumentControllerView {
  private _state: DocumentState = DocumentState.IDLE;
  private _currentBytes: Uint8Array | null = null;
  private _pageCount = 0;
  private _documentId: string | null = null;
  private _operationLock = false;

  constructor(private readonly events: TypedEventEmitter<DocSDKEventMap>) {}

  // ── DocumentControllerView implementation ──────────────────

  get state(): DocumentState {
    return this._state;
  }

  get currentBytes(): Uint8Array | null {
    return this._currentBytes;
  }

  get pageCount(): number {
    return this._pageCount;
  }

  /**
   * Update the canonical document bytes after a mutation.
   * Transitions to MODIFIED if the document was READY or already MODIFIED.
   * @throws {InvalidStateError} if not in a state that allows mutation
   */
  updateBytes(newBytes: Uint8Array): void {
    if (
      this._state !== DocumentState.READY &&
      this._state !== DocumentState.MODIFIED &&
      this._state !== DocumentState.LOADED
    ) {
      throw new InvalidStateError(this._state, 'updateBytes');
    }
    this._currentBytes = newBytes;
    if (this._state === DocumentState.READY || this._state === DocumentState.MODIFIED) {
      this._state = DocumentState.MODIFIED;
    }
  }

  /**
   * Set the known page count (usually called by the PDF engine after parsing).
   */
  setPageCount(count: number): void {
    this._pageCount = count;
  }

  // ── Internal state machine ─────────────────────────────────

  get documentId(): string | null {
    return this._documentId;
  }

  /** Whether an async operation (load/export) is in progress. */
  get isLocked(): boolean {
    return this._operationLock;
  }

  /**
   * Validate and execute a state transition.
   * @throws {InvalidStateError} if the transition is not allowed
   */
  private transition(to: DocumentState): void {
    const allowed = VALID_TRANSITIONS[this._state];
    if (!allowed?.includes(to)) {
      throw new InvalidStateError(this._state, `transition to ${to}`);
    }
    this._state = to;
  }

  /**
   * Acquire the operation lock. Prevents concurrent load/export.
   * @throws {Error} if already locked
   */
  private acquireLock(operation: string): void {
    if (this._operationLock) {
      throw new Error(
        `Cannot ${operation}: another operation is in progress. ` +
        `Wait for the current operation to finish or abort it.`,
      );
    }
    this._operationLock = true;
  }

  private releaseLock(): void {
    this._operationLock = false;
  }

  // ── Document lifecycle operations ──────────────────────────

  /**
   * Load a document from the given source using the provided loader function.
   * Returns a `DocumentHandle` snapshot on success.
   *
   * @param source - The document source descriptor
   * @param loader - An async function that resolves the source to raw bytes
   * @param signal - Optional AbortSignal to cancel the operation
   * @returns A handle to the loaded document
   * @throws {DocumentLoadError} if loading fails
   */
  async load(
    source: DocumentSource,
    loader: (source: DocumentSource) => Promise<Uint8Array>,
    signal?: AbortSignal,
  ): Promise<DocumentHandle> {
    this.acquireLock('load');

    try {
      this.transition(DocumentState.LOADING);
      this.events.emit('document:loading', { source });

      // Check for cancellation before starting async work
      if (signal?.aborted) {
        throw new Error('Load aborted');
      }

      const bytes = await loader(source);

      // Check for cancellation after async work
      if (signal?.aborted) {
        throw new Error('Load aborted');
      }

      this._currentBytes = bytes;
      this._documentId = `doc_${++nextId}`;
      this._state = DocumentState.LOADED;

      const handle: DocumentHandle = {
        id: this._documentId,
        pageCount: this._pageCount,
        bytes: this._currentBytes,
        mimeType: undefined,
      };

      this.events.emit('document:loaded', { document: handle, pageCount: this._pageCount });
      return handle;
    } catch (err) {
      this._state = DocumentState.IDLE;
      const error =
        err instanceof Error ? err : new DocumentLoadError('Failed to load document', err);
      this.events.emit('document:error', { error, phase: 'loading' });
      throw error;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Mark that a page is beginning to render.
   * @throws {InvalidStateError} if the state doesn't allow rendering
   */
  markRendering(pageNumber: number): void {
    this.transition(DocumentState.RENDERING);
    this.events.emit('page:rendering', { pageNumber });
  }

  /**
   * Mark that a page has finished rendering.
   * Transitions from RENDERING → READY.
   */
  markRendered(pageNumber: number, canvas: CanvasTarget): void {
    if (this._state === DocumentState.RENDERING) {
      this._state = DocumentState.READY;
    }
    this.events.emit('page:rendered', { pageNumber, canvas });
  }

  /**
   * Serialize the document using the provided serializer.
   * Transitions LOADED/READY/MODIFIED → EXPORTING → READY on success.
   *
   * @param serializer - Async function producing the export bytes
   * @param signal - Optional AbortSignal to cancel the operation
   */
  async export(
    serializer: () => Promise<Uint8Array>,
    signal?: AbortSignal,
  ): Promise<Uint8Array> {
    this.acquireLock('export');

    try {
      this.transition(DocumentState.EXPORTING);
      this.events.emit('document:exporting', {} as Record<string, never>);

      if (signal?.aborted) {
        throw new Error('Export aborted');
      }

      const bytes = await serializer();

      if (signal?.aborted) {
        throw new Error('Export aborted');
      }

      this._currentBytes = bytes;
      this._state = DocumentState.READY;
      this.events.emit('document:exported', { bytes });
      return bytes;
    } catch (err) {
      this._state = DocumentState.LOADED;
      const error = err instanceof Error ? err : new Error('Export failed');
      this.events.emit('document:error', { error, phase: 'exporting' });
      throw error;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Reset to IDLE state, clearing all document data.
   * Emits `document:closed`.
   */
  reset(): void {
    this._state = DocumentState.IDLE;
    this._currentBytes = null;
    this._pageCount = 0;
    this._documentId = null;
    this._operationLock = false;
    this.events.emit('document:closed', {} as Record<string, never>);
  }
}
