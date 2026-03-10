import { createContext, type ReactNode } from 'react';
import type { DocumentSDK } from '@docsdk/shared-types';

export const DocSDKContext = createContext<DocumentSDK | null>(null);

export interface DocSDKProviderProps {
  sdk: DocumentSDK;
  children: ReactNode;
}

export function DocSDKProvider({ sdk, children }: DocSDKProviderProps) {
  return <DocSDKContext.Provider value={sdk}>{children}</DocSDKContext.Provider>;
}
