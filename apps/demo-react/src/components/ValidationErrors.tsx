import type { ValidationError } from '@docsdk/shared-types';

interface ValidationErrorsProps {
  errors: readonly ValidationError[];
  isValid: boolean;
}

export function ValidationErrors({ errors, isValid }: ValidationErrorsProps) {
  if (isValid || errors.length === 0) return null;

  return (
    <div className="validation-errors">
      <strong>Validation Errors ({errors.length})</strong>
      <ul>
        {errors.map((err, i) => (
          <li key={`${err.fieldName}-${i}`}>
            <strong>{err.fieldName}:</strong> {err.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
