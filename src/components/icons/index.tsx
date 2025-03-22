import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

// Generic icon component
export const Icon: React.FC<IconProps> = ({ 
  size = 24, 
  children, 
  ...props 
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

// Cloud upload icon
export const CloudArrowUpIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </Icon>
);

// Cloud download icon
export const CloudArrowDownIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
  </Icon>
);

// Warning icon
export const ExclamationTriangleIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </Icon>
); 