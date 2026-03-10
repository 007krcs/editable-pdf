import type { FormFieldDescriptor } from './form.js';

/**
 * A single validation error for a specific field.
 */
export interface ValidationError {
  readonly fieldName: string;
  readonly rule: string;
  readonly message: string;
}

/**
 * Aggregated result of running all validation rules.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

/**
 * Contract for a validation rule that checks form fields.
 * Plugins can implement custom rules beyond the built-in required check.
 */
export interface ValidationRule {
  readonly name: string;
  validate(fields: readonly FormFieldDescriptor[]): ValidationError[];
}
