import type { FormFieldDescriptor, FormFieldValue } from '@docsdk/shared-types';

interface FormFieldPanelProps {
  fields: FormFieldDescriptor[];
  onFieldChange: (name: string, value: FormFieldValue) => void;
}

export function FormFieldPanel({ fields, onFieldChange }: FormFieldPanelProps) {
  if (fields.length === 0) return null;

  return (
    <div className="sidebar-section">
      <h3>Form Fields ({fields.length})</h3>
      {fields.map((field) => (
        <div key={field.name} className="field-item">
          <label>
            {field.name}
            {field.required && <span className="required"> *</span>}
            <span className="field-type"> ({field.type})</span>
          </label>
          {field.type === 'TEXT' && (
            <input
              type="text"
              value={String(field.value ?? '')}
              onChange={(e) => onFieldChange(field.name, e.target.value)}
              disabled={field.readOnly}
            />
          )}
          {field.type === 'CHECKBOX' && (
            <input
              type="checkbox"
              checked={field.value === true}
              onChange={(e) => onFieldChange(field.name, e.target.checked)}
              disabled={field.readOnly}
            />
          )}
          {field.type === 'DROPDOWN' && (
            <select
              value={String(field.value ?? '')}
              onChange={(e) => onFieldChange(field.name, e.target.value)}
              disabled={field.readOnly}
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
