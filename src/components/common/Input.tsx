import React, { forwardRef } from 'react';

export type InputVariant = 'default' | 'filled' | 'outlined';
export type InputSize = 'small' | 'medium' | 'large';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Input variant
   */
  variant?: InputVariant;
  
  /**
   * Input size
   */
  size?: InputSize;
  
  /**
   * Input is full width
   */
  fullWidth?: boolean;
  
  /**
   * Leading icon
   */
  startIcon?: React.ReactNode;
  
  /**
   * Trailing icon
   */
  endIcon?: React.ReactNode;
  
  /**
   * Error message
   */
  error?: string;
  
  /**
   * Helper text
   */
  helperText?: string;
  
  /**
   * Label for the input
   */
  label?: string;
}

/**
 * Input component for text entry
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  variant = 'default',
  size = 'medium',
  fullWidth = false,
  startIcon,
  endIcon,
  error,
  helperText,
  label,
  className = '',
  disabled,
  ...props
}, ref) => {
  // Base styles
  const baseStyles = 'appearance-none rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
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
  
  // Icon styles
  const hasStartIcon = startIcon ? 'pl-10' : '';
  const hasEndIcon = endIcon ? 'pr-10' : '';
  
  // Combined styles
  const inputStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${disabledStyles} ${errorStyles} ${hasStartIcon} ${hasEndIcon} ${className}`;
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        {startIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {startIcon}
          </div>
        )}
        
        <input
          ref={ref}
          className={inputStyles}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        />
        
        {endIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {endIcon}
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <p className={`mt-1 text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input; 