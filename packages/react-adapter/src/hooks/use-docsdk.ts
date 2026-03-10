import { useContext } from 'react';
import type { DocumentSDK } from '@docsdk/shared-types';
import { DocSDKContext } from '../context.js';

export function useDocSDK(): DocumentSDK {
  const sdk = useContext(DocSDKContext);
  if (!sdk) {
    throw new Error('useDocSDK must be used within a DocSDKProvider');
  }
  return sdk;
}
