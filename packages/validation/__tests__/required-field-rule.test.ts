import { describe, it, expect } from 'vitest';
import { RequiredFieldRule } from '../src/required-field-rule.js';
import { FormFieldType, type FormFieldDescriptor } from '@docsdk/shared-types';

function makeField(overrides: Partial<FormFieldDescriptor> = {}): FormFieldDescriptor {
  return {
    name: 'test',
    type: FormFieldType.TEXT,
    required: false,
    readOnly: false,
    value: '',
    page: 1,
    rect: { x: 0, y: 0, width: 100, height: 30 },
    ...overrides,
  };
}

describe('RequiredFieldRule', () => {
  const rule = new RequiredFieldRule();

  it('should return no errors for non-required fields', () => {
    const fields = [makeField({ name: 'optional', required: false, value: '' })];
    expect(rule.validate(fields)).toEqual([]);
  });

  it('should return error for required empty text field', () => {
    const fields = [makeField({ name: 'name', required: true, value: '' })];
    const errors = rule.validate(fields);
    expect(errors).toHaveLength(1);
    expect(errors[0].fieldName).toBe('name');
    expect(errors[0].rule).toBe('required');
  });

  it('should return error for required null value', () => {
    const fields = [makeField({ name: 'sig', required: true, value: null })];
    expect(rule.validate(fields)).toHaveLength(1);
  });

  it('should return error for required unchecked checkbox', () => {
    const fields = [
      makeField({ name: 'agree', type: FormFieldType.CHECKBOX, required: true, value: false }),
    ];
    expect(rule.validate(fields)).toHaveLength(1);
  });

  it('should pass for required filled text field', () => {
    const fields = [makeField({ name: 'name', required: true, value: 'Jane' })];
    expect(rule.validate(fields)).toEqual([]);
  });

  it('should pass for required checked checkbox', () => {
    const fields = [
      makeField({ name: 'agree', type: FormFieldType.CHECKBOX, required: true, value: true }),
    ];
    expect(rule.validate(fields)).toEqual([]);
  });

  it('should handle multiple fields with mixed validation', () => {
    const fields = [
      makeField({ name: 'first', required: true, value: 'John' }),
      makeField({ name: 'last', required: true, value: '' }),
      makeField({ name: 'middle', required: false, value: '' }),
      makeField({ name: 'email', required: true, value: null }),
    ];
    const errors = rule.validate(fields);
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.fieldName)).toEqual(['last', 'email']);
  });
});
