import type { ValidationRule, ValidationError, FormFieldDescriptor } from '@docsdk/shared-types';
import { FormFieldType } from '@docsdk/shared-types';

export interface LengthConstraint {
  /** Field name to apply this constraint to */
  readonly fieldName: string;
  readonly minLength?: number;
  readonly maxLength?: number;
}

/**
 * Validates text field values against min/max length constraints.
 * Constraints are configured per-field at construction time.
 */
export class LengthFieldRule implements ValidationRule {
  readonly name = 'length';

  private constraints: Map<string, LengthConstraint>;

  constructor(constraints: LengthConstraint[] = []) {
    this.constraints = new Map(constraints.map((c) => [c.fieldName, c]));
  }

  addConstraint(constraint: LengthConstraint): void {
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

      if (constraint.minLength !== undefined && value.length < constraint.minLength) {
        errors.push({
          fieldName: field.name,
          rule: this.name,
          message: `"${field.name}" must be at least ${constraint.minLength} characters`,
        });
      }

      if (constraint.maxLength !== undefined && value.length > constraint.maxLength) {
        errors.push({
          fieldName: field.name,
          rule: this.name,
          message: `"${field.name}" must be at most ${constraint.maxLength} characters`,
        });
      }
    }

    return errors;
  }
}
