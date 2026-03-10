import type {
  DocSDKPlugin,
  PluginContext,
  FileTypeInfo,
  DocumentMetadata,
} from '@docsdk/shared-types';
import { detectFileType } from './file-type-detector.js';
import { readMetadata } from './metadata-reader.js';

/**
 * Detection plugin — identifies file types and extracts PDF metadata.
 *
 * **Standalone**: depends only on `@docsdk/shared-types` and `@docsdk/core`.
 * No external PDF libraries are required; metadata is extracted from raw bytes.
 *
 * Behavior:
 * - On `document:loaded`, automatically detects file type and extracts metadata.
 * - Emits `document:detected` with `{ fileType, metadata }`.
 * - Exposes `detectFileType()` and `readMetadata()` for on-demand use.
 */
export class DetectionPlugin implements DocSDKPlugin {
  readonly name = 'detection' as const;
  readonly version = '0.1.0';

  private context: PluginContext | null = null;

  initialize(context: PluginContext): void {
    this.context = context;

    // Auto-detect on document load
    context.events.on('document:loaded', () => {
      const bytes = context.documentController.currentBytes;
      if (!bytes) return;

      const fileType = detectFileType(bytes);
      const metadata = fileType.type === 'pdf' ? readMetadata(bytes) : {};

      context.events.emit('document:detected', { fileType, metadata });
    });
  }

  /**
   * Detect the file type of the currently loaded document.
   * @throws {Error} if no document is loaded
   */
  detectFileType(): FileTypeInfo {
    const bytes = this.requireBytes();
    return detectFileType(bytes);
  }

  /**
   * Read metadata from the currently loaded document.
   * Only meaningful for PDF files; returns empty metadata for other types.
   * @throws {Error} if no document is loaded
   */
  readMetadata(): DocumentMetadata {
    const bytes = this.requireBytes();
    return readMetadata(bytes);
  }

  async destroy(): Promise<void> {
    this.context = null;
  }

  // ── Internal helpers ───────────────────────────────────

  private requireBytes(): Uint8Array {
    const bytes = this.context?.documentController.currentBytes;
    if (!bytes) {
      throw new Error('No document loaded. Call sdk.load() first.');
    }
    return bytes;
  }
}
