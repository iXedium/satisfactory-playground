import React, { forwardRef, useEffect, useRef } from 'react';
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
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Combine the forwarded ref with our local ref
    const setRefs = (element: HTMLInputElement | null) => {
      // Update the local ref
      if (inputRef.current !== element) {
        inputRef.current = element;
      }
      
      // Forward the ref
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };
    
    // Add wheel event handler to prevent page scrolling when input is focused
    useEffect(() => {
      const input = inputRef.current;
      if (!input) return;
      
      const handleWheel = (e: WheelEvent) => {
        if (document.activeElement === input) {
          e.preventDefault();
        }
      };
      
      // Use the capture phase to ensure we get the event before the browser
      input.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        input.removeEventListener('wheel', handleWheel);
      };
    }, []);
    
    return (
      <StyledInputBase
        ref={setRefs}
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