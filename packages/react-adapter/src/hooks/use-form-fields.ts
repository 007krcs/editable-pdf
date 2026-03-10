import { useState, useCallback, useEffect } from 'react';
import type { FormFieldDescriptor, FormFieldValue } from '@docsdk/shared-types';
import type { FormEnginePlugin } from '@docsdk/form-engine';
import { useDocSDK } from './use-docsdk.js';

export interface UseFormFieldsReturn {
  fields: FormFieldDescriptor[];
  setFieldValue: (fieldName: string, value: FormFieldValue) => Promise<void>;
  getFieldValue: (fieldName: string) => FormFieldValue;
  getAllValues: () => Record<string, FormFieldValue>;
}

export function useFormFields(): UseFormFieldsReturn {
  const sdk = useDocSDK();
  const [fields, setFields] = useState<FormFieldDescriptor[]>([]);

  useEffect(() => {
    const unsubs = [
      sdk.events.on('fields:detected', ({ fields: detected }) => {
        setFields([...detected]);
      }),
      sdk.events.on('field:changed', () => {
        try {
          const formEngine = sdk.getPlugin<FormEnginePlugin>('form-engine');
          setFields(formEngine.getFields());
        } catch {
          // form-engine not available
        }
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [sdk]);

  const setFieldValue = useCallback(
    async (fieldName: string, value: FormFieldValue) => {
      const formEngine = sdk.getPlugin<FormEnginePlugin>('form-engine');
      await formEngine.writeFieldValue(fieldName, value);
    },
    [sdk],
  );

  const getFieldValue = useCallback(
    (fieldName: string) => {
      const formEngine = sdk.getPlugin<FormEnginePlugin>('form-engine');
      return formEngine.readFieldValue(fieldName);
    },
    [sdk],
  );

  const getAllValues = useCallback(() => {
    const formEngine = sdk.getPlugin<FormEnginePlugin>('form-engine');
    return formEngine.readAllFieldValues();
  }, [sdk]);

  return { fields, setFieldValue, getFieldValue, getAllValues };
}
