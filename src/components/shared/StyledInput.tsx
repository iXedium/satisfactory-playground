import React, { forwardRef } from 'react';
import { styled } from '@mui/material/styles';
import { theme } from '../../styles/theme';

interface StyledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'compact';
}

const StyledInputBase = styled('input')<{ $variant?: 'default' | 'compact' }>(({ $variant = 'default' }) => ({
  height: $variant === 'compact' ? '20px' : '24px',
  textAlign: 'right',
  paddingRight: '12px',
  paddingLeft: '12px',
  border: `2px solid ${theme.colors.dropdown.border}`,
  borderRadius: theme.border.radius,
  background: theme.colors.dark,
  color: theme.colors.text,
  fontSize: $variant === 'compact' ? '13px' : '14px',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  transition: 'all 0.2s ease-in-out',
  outline: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'textfield',
  '&:focus': {
    borderColor: theme.colors.primary
  },
  '&:hover': {
    borderColor: theme.colors.dropdown.border
  },
  '&.no-spinners::-webkit-inner-spin-button, &.no-spinners::-webkit-outer-spin-button': {
    WebkitAppearance: 'none',
    margin: 0
  }
}));

const StyledInput = forwardRef<HTMLInputElement, StyledInputProps>(
  ({ variant = 'default', style, ...props }, ref) => {
    return (
      <StyledInputBase
        ref={ref}
        $variant={variant}
        className="no-spinners"
        style={style}
        {...props}
      />
    );
  }
);

StyledInput.displayName = 'StyledInput';

export default StyledInput; 