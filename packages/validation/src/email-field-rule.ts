import type { ValidationRule, ValidationError, FormFieldDescriptor } from '@docsdk/shared-types';
import { FormFieldType } from '@docsdk/shared-types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates that text fields whose name contains "email" (case-insensitive)
 * hold a valid email address format, if they have a non-empty value.
 */
export class EmailFieldRule implements ValidationRule {
  readonly name = 'email';

  validate(fields: readonly FormFieldDescriptor[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const field of fields) {
      if (field.type !== FormFieldType.TEXT) continue;
      if (!field.name.toLowerCase().includes('email')) continue;

      const value = field.value;
      if (typeof value !== 'string' || value === '') continue;

      if (!EMAIL_REGEX.test(value)) {
        errors.push({
          fieldName: field.name,
          rule: this.name,
          message: `"${field.name}" must be a valid email address`,
        });
      }
    }

    return errors;
  }
}
