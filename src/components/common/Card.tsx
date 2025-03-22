import React from 'react';

export type CardVariant = 'default' | 'outlined' | 'elevated';

export interface CardProps {
  /** Card variant */
  variant?: CardVariant;
  /** Whether to disable padding */
  noPadding?: boolean;
  /** Card title */
  title?: React.ReactNode;
  /** Card subtitle */
  subtitle?: React.ReactNode;
  /** Card actions */
  actions?: React.ReactNode;
  /** Custom header render */
  renderHeader?: () => React.ReactNode;
  /** Custom footer render */
  renderFooter?: () => React.ReactNode;
  /** Card content */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
  /** Style object */
  style?: React.CSSProperties;
  /** onClick handler */
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** onMouseEnter handler */
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** onMouseLeave handler */
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Card component for containing related information
 */
export const Card: React.FC<CardProps> = ({
  variant = 'default',
  noPadding = false,
  title,
  subtitle,
  actions,
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