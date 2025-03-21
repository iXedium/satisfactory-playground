import React, { forwardRef } from 'react';

export type SelectVariant = 'default' | 'filled' | 'outlined';
export type SelectSize = 'small' | 'medium' | 'large';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /**
   * Select variant
   */
  variant?: SelectVariant;
  
  /**
   * Select size
   */
  size?: SelectSize;
  
  /**
   * Select is full width
   */
  fullWidth?: boolean;
  
  /**
   * Options for the select
   */
  options: SelectOption[];
  
  /**
   * Placeholder text
   */
  placeholder?: string;
  
  /**
   * Error message
   */
  error?: string;
  
  /**
   * Helper text
   */
  helperText?: string;
  
  /**
   * Label for the select
   */
  label?: string;
}

/**
 * Select component for choosing from options
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  variant = 'default',
  size = 'medium',
  fullWidth = false,
  options = [],
  placeholder,
  error,
  helperText,
  label,
  className = '',
  disabled,
  ...props
}, ref) => {
  // Base styles
  const baseStyles = 'appearance-none rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 pr-10';
  
  // Variant styles
  const variantStyles = {
    default: 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    filled: 'bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-blue-500',
    outlined: 'bg-transparent border border-gray-300 focus:border-blue-500 focus:ring-blue-500',
  };
  
  // Size styles
  const sizeStyles = {
    small: 'text-xs py-1 px-2',
    medium: 'text-sm py-2 px-4',
    large: 'text-base py-3 px-6',
  };
  
  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';
  
  // Disabled styles
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : '';
  
  // Error styles
  const errorStyles = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '';
  
  // Combined styles
  const selectStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${disabledStyles} ${errorStyles} ${className}`;
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <select
          ref={ref}
          className={selectStyles}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M7 7l3-3 3 3m0 6l-3 3-3-3"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      
      {(error || helperText) && (
        <p className={`mt-1 text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select; 