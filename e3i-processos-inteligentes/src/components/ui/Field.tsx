import React, { useId } from 'react';

export interface FieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

function cloneWithFieldProps(
  element: React.ReactNode,
  fieldProps: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }
): React.ReactNode {
  if (!React.isValidElement(element)) {
    return element;
  }

  const type: any = element.type;
  const isFormControl =
    type === Input ||
    type === Select ||
    type === Textarea ||
    (typeof type === 'string' && ['input', 'select', 'textarea'].includes(type));

  if (isFormControl) {
    return React.cloneElement(element as React.ReactElement<any>, {
      id: (element.props as any).id || fieldProps.id,
      'aria-invalid': (element.props as any)['aria-invalid'] ?? fieldProps['aria-invalid'],
      'aria-describedby': (element.props as any)['aria-describedby'] || fieldProps['aria-describedby'],
    });
  }

  const elementProps = element.props as { children?: React.ReactNode };
  if (elementProps && elementProps.children) {
    const newChildren = React.Children.map(elementProps.children, (child) =>
      cloneWithFieldProps(child, fieldProps)
    );
    return React.cloneElement(element as React.ReactElement<any>, (element.props as any) || {}, newChildren);
  }

  return element;
}

export const Field: React.FC<FieldProps> = ({
  label,
  error,
  helperText,
  required,
  className = '',
  children,
}) => {
  const generatedId = useId();
  const fieldProps = {
    id: generatedId,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${generatedId}-error` : helperText ? `${generatedId}-helper` : undefined,
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={generatedId} className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div>
        {React.Children.map(children, (child) => cloneWithFieldProps(child, fieldProps))}
      </div>
      {error ? (
        <p id={`${generatedId}-error`} className="text-xs text-danger font-medium mt-1">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${generatedId}-helper`} className="text-xs text-text-muted mt-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full px-4 py-2.5 rounded-xl bg-surface-raised text-text-primary placeholder:text-text-muted border ${
          error ? 'border-danger' : 'border-border-subtle focus:border-accent'
        } focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all duration-200 text-sm ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full px-4 py-2.5 rounded-xl bg-surface-raised text-text-primary border ${
          error ? 'border-danger' : 'border-border-subtle focus:border-accent'
        } focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all duration-200 text-sm ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full px-4 py-2.5 rounded-xl bg-surface-raised text-text-primary placeholder:text-text-muted border ${
          error ? 'border-danger' : 'border-border-subtle focus:border-accent'
        } focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all duration-200 text-sm ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
