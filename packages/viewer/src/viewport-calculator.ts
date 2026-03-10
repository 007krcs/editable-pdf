import type { RenderOptions, Viewport } from '@docsdk/shared-types';

export function calculateViewport(
  pageWidth: number,
  pageHeight: number,
  options: RenderOptions = {},
): Viewport {
  const scale = options.scale ?? 1.0;
  const rotation = options.rotation ?? 0;
  const dpi = options.dpi ?? 72;
  const dpiScale = dpi / 72;
  const totalScale = scale * dpiScale;

  let width: number;
  let height: number;

  if (rotation === 90 || rotation === 270) {
    width = Math.floor(pageHeight * totalScale);
    height = Math.floor(pageWidth * totalScale);
  } else {
    width = Math.floor(pageWidth * totalScale);
    height = Math.floor(pageHeight * totalScale);
  }

  return { width, height, scale: totalScale, rotation };
}
