import type { FormFieldDescriptor, FormFieldValue } from '@docsdk/shared-types';

interface FormFieldPanelProps {
  fields: FormFieldDescriptor[];
  onFieldChange: (name: string, value: FormFieldValue) => void;
}

export function FormFieldPanel({ fields, onFieldChange }: FormFieldPanelProps) {
  if (fields.length === 0) return null;

  return (
    <div className="sidebar-section" role="form" aria-label="PDF form fields">
      <h3>Form Fields ({fields.length})</h3>
      {fields.map((field) => (
        <div key={field.name} className="field-item">
          <label htmlFor={`field-${field.name}`}>
            {field.name}
            {field.required && <span className="required"> *</span>}
            <span className="field-type"> ({field.type})</span>
          </label>
          {field.type === 'TEXT' && (
            <input
              id={`field-${field.name}`}
              type="text"
              value={String(field.value ?? '')}
              onChange={(e) => onFieldChange(field.name, e.target.value)}
              disabled={field.readOnly}
              aria-required={field.required}
            />
          )}
          {field.type === 'CHECKBOX' && (
            <input
              id={`field-${field.name}`}
              type="checkbox"
              checked={field.value === true}
              onChange={(e) => onFieldChange(field.name, e.target.checked)}
              disabled={field.readOnly}
              aria-required={field.required}
              aria-label={field.name}
            />
          )}
          {field.type === 'DROPDOWN' && (
            <select
              id={`field-${field.name}`}
              value={String(field.value ?? '')}
              onChange={(e) => onFieldChange(field.name, e.target.value)}
              disabled={field.readOnly}
              aria-required={field.required}
            >
              <option value="">Select...</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}
