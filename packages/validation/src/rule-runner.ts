import type {
  ValidationRule,
  ValidationResult,
  FormFieldDescriptor,
} from '@docsdk/shared-types';

export class RuleRunner {
  private rules: ValidationRule[] = [];

  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  removeRule(name: string): void {
    this.rules = this.rules.filter((r) => r.name !== name);
  }

  run(fields: FormFieldDescriptor[]): ValidationResult {
    const errors = this.rules.flatMap((rule) => rule.validate(fields));
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
