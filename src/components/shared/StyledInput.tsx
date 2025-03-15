import React from 'react';
import { theme } from '../../styles/theme';

interface StyledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'compact';
}

const StyledInput: React.FC<StyledInputProps> = ({ variant = 'default', style, ...props }) => {
  const baseStyles: React.CSSProperties = {
    height: variant === 'compact' ? '28px' : '32px',
    textAlign: 'right',
    paddingRight: '12px',
    paddingLeft: '12px',
    border: `2px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    background: theme.colors.dark,
    color: theme.colors.text,
    fontSize: variant === 'compact' ? '13px' : '14px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.2s ease-in-out',
    outline: 'none',
    '&:focus': {
      borderColor: theme.colors.primary
    },
    '&:hover': {
      borderColor: theme.colors.dropdown.border
    },
    WebkitAppearance: 'none',
    MozAppearance: 'textfield',
    ...style
  };

  return (
    <input
      {...props}
      style={baseStyles}
      className="no-spinners"
    />
  );
};

export default StyledInput; 