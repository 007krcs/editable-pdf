import type { ValidationRule, ValidationError, FormFieldDescriptor } from '@docsdk/shared-types';

export class RequiredFieldRule implements ValidationRule {
  readonly name = 'required';

  validate(fields: FormFieldDescriptor[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const field of fields) {
      if (!field.required) continue;

      const isEmpty =
        field.value === null ||
        field.value === '' ||
        field.value === false ||
        (Array.isArray(field.value) && field.value.length === 0);

      if (isEmpty) {
        errors.push({
          fieldName: field.name,
          rule: this.name,
          message: `Field "${field.name}" is required`,
        });
      }
    }

    return errors;
  }
}
