/**
 * Result of detecting a file's type from its raw bytes.
 */
export interface FileTypeInfo {
  /** Detected file type identifier (e.g. 'pdf', 'unknown') */
  readonly type: string;
  /** Format version if detectable (e.g. '1.7', '2.0') */
  readonly version?: string;
  /** MIME type if known (e.g. 'application/pdf') */
  readonly mimeType?: string;
}

/**
 * Metadata about a document's origin and creation.
 */
export interface DocumentMetadata {
  readonly title?: string;
  readonly author?: string;
  readonly subject?: string;
  readonly creator?: string;
  readonly producer?: string;
  readonly creationDate?: Date;
  readonly modificationDate?: Date;
  readonly pageCount?: number;
}
