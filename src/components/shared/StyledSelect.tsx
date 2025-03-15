import React, { useState, useRef } from 'react';
import { theme } from '../../styles/theme';
import DropdownPortal from '../DropdownPortal';

interface StyledSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
  placeholder?: string;
  style?: React.CSSProperties;
  renderOption?: (option: { id: string; name: string }) => React.ReactNode;
  variant?: 'default' | 'compact';
}

const StyledSelect: React.FC<StyledSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  style,
  renderOption,
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  const baseStyles: React.CSSProperties = {
    height: variant === 'compact' ? '28px' : '32px',
    padding: variant === 'compact' ? '4px 12px' : '6px 12px',
    fontSize: variant === 'compact' ? '13px' : '14px',
    border: `2px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    background: theme.colors.dark,
    color: theme.colors.text,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      borderColor: theme.colors.dropdown.borderHover
    }
  };

  const dropdownStyles: React.CSSProperties = {
    background: theme.colors.dark,
    border: `2px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: 1000
  };

  const dropdownItemStyles: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: theme.colors.dropdown.hoverBackground
    }
  };

  return (
    <div style={{ position: 'relative', ...style }} ref={buttonRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={baseStyles}
      >
        {selectedOption ? (
          renderOption ? renderOption(selectedOption) : selectedOption.name
        ) : placeholder}
      </div>

      <DropdownPortal
        anchorEl={buttonRef.current}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <div style={dropdownStyles}>
          {options.map((option) => (
            <div
              key={option.id}
              onClick={() => {
                onChange(option.id);
                setIsOpen(false);
              }}
              style={{
                ...dropdownItemStyles,
                backgroundColor: option.id === value ? theme.colors.dropdown.hoverBackground : 'transparent'
              }}
            >
              {renderOption ? renderOption(option) : option.name}
            </div>
          ))}
        </div>
      </DropdownPortal>
    </div>
  );
};

export default StyledSelect; 