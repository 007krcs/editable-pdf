import { useCallback } from 'react';
import type { ScreenshotPlugin } from '@docsdk/screenshot';
import type { ScreenshotOptions } from '@docsdk/shared-types';
import { useDocSDK } from './use-docsdk.js';

export interface UseScreenshotReturn {
  capturePage: (options: ScreenshotOptions) => Promise<Uint8Array>;
  capturePageAsDataURL: (options: ScreenshotOptions) => Promise<string>;
}

export function useScreenshot(): UseScreenshotReturn {
  const sdk = useDocSDK();

  const capturePage = useCallback(
    (options: ScreenshotOptions) => {
      const plugin = sdk.getPlugin<ScreenshotPlugin>('screenshot');
      return plugin.capturePage(options);
    },
    [sdk],
  );

  const capturePageAsDataURL = useCallback(
    (options: ScreenshotOptions) => {
      const plugin = sdk.getPlugin<ScreenshotPlugin>('screenshot');
      return plugin.capturePageAsDataURL(options);
    },
    [sdk],
  );

  return { capturePage, capturePageAsDataURL };
}
