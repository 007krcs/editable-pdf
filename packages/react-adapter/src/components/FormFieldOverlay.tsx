import { type CSSProperties } from 'react';
import { FormFieldType, type FormFieldDescriptor, type FormFieldValue } from '@docsdk/shared-types';
import { useFormFields } from '../hooks/use-form-fields.js';

export interface FormFieldOverlayProps {
  scale?: number;
  pageNumber?: number;
  style?: CSSProperties;
  className?: string;
}

export function FormFieldOverlay({
  scale = 1.0,
  pageNumber,
  style,
  className,
}: FormFieldOverlayProps) {
  const { fields, setFieldValue } = useFormFields();

  const filteredFields = pageNumber
    ? fields.filter((f) => f.page === pageNumber)
    : fields;

  return (
    <div
      style={{ position: 'relative', ...style }}
      className={className}
    >
      {filteredFields.map((field) => (
        <FieldInput
          key={field.name}
          field={field}
          scale={scale}
          onChange={(value) => setFieldValue(field.name, value)}
        />
      ))}
    </div>
  );
}

interface FieldInputProps {
  field: FormFieldDescriptor;
  scale: number;
  onChange: (value: FormFieldValue) => void;
}

function FieldInput({ field, scale, onChange }: FieldInputProps) {
  const positionStyle: CSSProperties = {
    position: 'absolute',
    left: field.rect.x * scale,
    bottom: field.rect.y * scale,
    width: field.rect.width * scale,
    height: field.rect.height * scale,
    fontSize: Math.max(10, field.rect.height * scale * 0.6),
    boxSizing: 'border-box',
  };

  if (field.readOnly) {
    return null;
  }

  switch (field.type) {
    case FormFieldType.TEXT:
      return (
        <input
          type="text"
          value={String(field.value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...positionStyle, border: '1px solid #ccc', padding: '2px' }}
          placeholder={field.name}
        />
      );
    case FormFieldType.CHECKBOX:
      return (
        <input
          type="checkbox"
          checked={field.value === true}
          onChange={(e) => onChange(e.target.checked)}
          style={positionStyle}
        />
      );
    case FormFieldType.DROPDOWN:
      return (
        <select
          value={String(field.value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          style={positionStyle}
        >
          <option value="">Select...</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    default:
      return null;
  }
}
