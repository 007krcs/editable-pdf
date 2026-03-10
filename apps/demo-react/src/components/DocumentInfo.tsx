import type { FileTypeInfo, DocumentMetadata } from '@docsdk/shared-types';

interface DocumentInfoProps {
  fileType: FileTypeInfo | null;
  metadata: DocumentMetadata | null;
}

export function DocumentInfo({ fileType, metadata }: DocumentInfoProps) {
  if (!fileType && !metadata) return null;

  return (
    <div className="sidebar-section">
      <h3>Document Info</h3>
      <dl className="doc-info-grid">
        {fileType && (
          <>
            <dt>Type</dt>
            <dd>{fileType.type.toUpperCase()}</dd>
            {fileType.version && (
              <>
                <dt>Version</dt>
                <dd>{fileType.version}</dd>
              </>
            )}
            {fileType.mimeType && (
              <>
                <dt>MIME</dt>
                <dd>{fileType.mimeType}</dd>
              </>
            )}
          </>
        )}
        {metadata && (
          <>
            {metadata.title && (
              <>
                <dt>Title</dt>
                <dd>{metadata.title}</dd>
              </>
            )}
            {metadata.author && (
              <>
                <dt>Author</dt>
                <dd>{metadata.author}</dd>
              </>
            )}
            {metadata.producer && (
              <>
                <dt>Producer</dt>
                <dd>{metadata.producer}</dd>
              </>
            )}
            {metadata.pageCount != null && (
              <>
                <dt>Pages</dt>
                <dd>{metadata.pageCount}</dd>
              </>
            )}
          </>
        )}
      </dl>
    </div>
  );
}
