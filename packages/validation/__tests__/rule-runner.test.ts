import { describe, it, expect } from 'vitest';
import { RuleRunner } from '../src/rule-runner.js';
import type { ValidationRule, FormFieldDescriptor } from '@docsdk/shared-types';
import { FormFieldType } from '@docsdk/shared-types';

function makeField(overrides: Partial<FormFieldDescriptor> = {}): FormFieldDescriptor {
  return {
    name: 'test',
    type: FormFieldType.TEXT,
    required: false,
    readOnly: false,
    value: '',
    page: 1,
    rect: { x: 0, y: 0, width: 100, height: 20 },
    ...overrides,
  };
}

const alwaysFailRule: ValidationRule = {
  name: 'always-fail',
  validate: (fields) => fields.map((f) => ({ fieldName: f.name, rule: 'always-fail', message: 'Failed' })),
};

describe('RuleRunner', () => {
  it('should start with no rules', () => {
    const runner = new RuleRunner();
    const result = runner.run([makeField()]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should add and execute a rule', () => {
    const runner = new RuleRunner();
    runner.addRule(alwaysFailRule);

    const result = runner.run([makeField({ name: 'field1' })]);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule).toBe('always-fail');
  });

  it('should remove a rule by name', () => {
    const runner = new RuleRunner();
    runner.addRule(alwaysFailRule);
    runner.removeRule('always-fail');

    const result = runner.run([makeField()]);
    expect(result.valid).toBe(true);
  });

  it('should run multiple rules and combine errors', () => {
    const runner = new RuleRunner();
    const rule1: ValidationRule = {
      name: 'rule1',
      validate: () => [{ fieldName: 'a', rule: 'rule1', message: 'Error 1' }],
    };
    const rule2: ValidationRule = {
      name: 'rule2',
      validate: () => [{ fieldName: 'b', rule: 'rule2', message: 'Error 2' }],
    };

    runner.addRule(rule1);
    runner.addRule(rule2);

    const result = runner.run([makeField()]);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('should be valid when all rules pass', () => {
    const runner = new RuleRunner();
    const passingRule: ValidationRule = {
      name: 'passing',
      validate: () => [],
    };
    runner.addRule(passingRule);

    const result = runner.run([makeField()]);
    expect(result.valid).toBe(true);
  });
});
