import type { CanvasTarget, ImageFormat } from '@docsdk/shared-types';

export async function encodeCanvas(
  canvas: CanvasTarget,
  format: ImageFormat = 'png',
  quality = 0.92,
): Promise<Uint8Array> {
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

  if (canvas instanceof OffscreenCanvas) {
    const blob = await canvas.convertToBlob({ type: mimeType, quality });
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  }

  // HTMLCanvasElement
  return new Promise<Uint8Array>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode canvas to blob'));
          return;
        }
        blob.arrayBuffer().then(
          (buf) => resolve(new Uint8Array(buf)),
          reject,
        );
      },
      mimeType,
      quality,
    );
  });
}

export async function encodeCanvasToDataURL(
  canvas: CanvasTarget,
  format: ImageFormat = 'png',
  quality = 0.92,
): Promise<string> {
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

  if (canvas instanceof HTMLCanvasElement) {
    return canvas.toDataURL(mimeType, quality);
  }

  // OffscreenCanvas: convert blob to data URL
  if (canvas instanceof OffscreenCanvas) {
    const blob = await canvas.convertToBlob({ type: mimeType, quality });
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:${mimeType};base64,${btoa(binary)}`;
  }

  throw new Error('Unsupported canvas type');
}
