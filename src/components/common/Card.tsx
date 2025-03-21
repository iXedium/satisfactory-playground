import React from 'react';

export type CardVariant = 'default' | 'outlined' | 'elevated';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Card variant
   */
  variant?: CardVariant;
  
  /**
   * Card title
   */
  title?: React.ReactNode;
  
  /**
   * Card subtitle
   */
  subtitle?: React.ReactNode;
  
  /**
   * Card actions (buttons, etc.)
   */
  actions?: React.ReactNode;
  
  /**
   * Remove padding
   */
  noPadding?: boolean;
  
  /**
   * Render header separately
   */
  renderHeader?: () => React.ReactNode;
  
  /**
   * Render footer separately
   */
  renderFooter?: () => React.ReactNode;
}

/**
 * Card component for containing related information
 */
export const Card: React.FC<CardProps> = ({
  variant = 'default',
  title,
  subtitle,
  actions,
  noPadding = false,
  renderHeader,
  renderFooter,
  children,
  className = '',
  ...props
}) => {
  // Base styles
  const baseStyles = 'overflow-hidden rounded-lg';
  
  // Variant styles
  const variantStyles = {
    default: 'bg-white',
    outlined: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-md',
  };
  
  // Combined styles
  const cardStyles = `${baseStyles} ${variantStyles[variant]} ${className}`;
  
  // Custom header or default header with title and subtitle
  const header = renderHeader ? (
    renderHeader()
  ) : (
    (title || subtitle) && (
      <div className="px-4 py-4 sm:px-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          {title && (
            <h3 className="text-lg font-medium text-gray-900">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    )
  );
  
  // Custom footer or no footer
  const footer = renderFooter && renderFooter();
  
  return (
    <div className={cardStyles} {...props}>
      {header}
      
      {children && (
        <div className={noPadding ? '' : 'p-4 sm:p-6'}>
          {children}
        </div>
      )}
      
      {footer}
    </div>
  );
};

export default Card; 