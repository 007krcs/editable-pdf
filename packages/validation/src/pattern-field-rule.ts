import type { ValidationRule, ValidationError, FormFieldDescriptor } from '@docsdk/shared-types';
import { FormFieldType } from '@docsdk/shared-types';

export interface PatternConstraint {
  /** Field name to apply this constraint to */
  readonly fieldName: string;
  /** Regex pattern the field value must match */
  readonly pattern: RegExp;
  /** Custom error message (defaults to "does not match the required pattern") */
  readonly message?: string;
}

/**
 * Validates text field values against custom regex patterns.
 * Constraints are configured per-field at construction time.
 */
export class PatternFieldRule implements ValidationRule {
  readonly name = 'pattern';

  private constraints: Map<string, PatternConstraint>;

  constructor(constraints: PatternConstraint[] = []) {
    this.constraints = new Map(constraints.map((c) => [c.fieldName, c]));
  }

  addConstraint(constraint: PatternConstraint): void {
    this.constraints.set(constraint.fieldName, constraint);
  }

  removeConstraint(fieldName: string): void {
    this.constraints.delete(fieldName);
  }

  validate(fields: readonly FormFieldDescriptor[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const field of fields) {
      if (field.type !== FormFieldType.TEXT) continue;

      const constraint = this.constraints.get(field.name);
      if (!constraint) continue;

      const value = typeof field.value === 'string' ? field.value : '';
      if (value === '') continue; // skip empty — use RequiredFieldRule for that

      if (!constraint.pattern.test(value)) {
        errors.push({
          fieldName: field.name,
          rule: this.name,
          message: constraint.message ?? `"${field.name}" does not match the required pattern`,
        });
      }
    }

    return errors;
  }
}
