import { useState, useCallback, useEffect } from 'react';
import type { ValidationResult, ValidationError } from '@docsdk/shared-types';
import type { ValidationPlugin } from '@docsdk/validation';
import { useDocSDK } from './use-docsdk.js';

export interface UseValidationReturn {
  validate: () => ValidationResult;
  result: ValidationResult | null;
  isValid: boolean;
  errors: readonly ValidationError[];
}

export function useValidation(): UseValidationReturn {
  const sdk = useDocSDK();
  const [result, setResult] = useState<ValidationResult | null>(null);

  useEffect(() => {
    const unsub = sdk.events.on('validation:result', (vr) => {
      setResult(vr);
    });
    return unsub;
  }, [sdk]);

  const validate = useCallback(() => {
    const validationPlugin = sdk.getPlugin<ValidationPlugin>('validation');
    const vr = validationPlugin.validate();
    setResult(vr);
    return vr;
  }, [sdk]);

  return {
    validate,
    result,
    isValid: result?.valid ?? true,
    errors: result?.errors ?? [],
  };
}
