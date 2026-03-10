import type { Rectangle } from './common.js';

/**
 * Supported form field types for detection and editing.
 */
export enum FormFieldType {
  TEXT = 'TEXT',
  CHECKBOX = 'CHECKBOX',
  DROPDOWN = 'DROPDOWN',
  RADIO = 'RADIO',
  SIGNATURE = 'SIGNATURE',
  BUTTON = 'BUTTON',
}

/**
 * The value a form field can hold.
 * - `string` for text inputs, dropdown selections, radio selections
 * - `boolean` for checkboxes
 * - `string[]` for multi-select dropdowns
 * - `null` for empty/unset fields
 */
export type FormFieldValue = string | boolean | string[] | null;

/**
 * Complete descriptor for a single detected form field.
 */
export interface FormFieldDescriptor {
  readonly name: string;
  readonly type: FormFieldType;
  readonly required: boolean;
  readonly readOnly: boolean;
  readonly value: FormFieldValue;
  readonly options?: readonly string[];
  readonly page: number;
  readonly rect: Rectangle;
}
