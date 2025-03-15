import React, { useState, useRef, useEffect } from 'react';
import { styled } from '@mui/material/styles';
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
  disabled?: boolean;
}

const SelectContainer = styled('div')({
  position: 'relative'
});

const SelectButton = styled('div')<{ $variant?: 'default' | 'compact'; $disabled?: boolean }>(
  ({ $variant = 'default', $disabled = false }) => ({
    height: $variant === 'compact' ? '28px' : '32px',
    padding: $variant === 'compact' ? '4px 12px' : '6px 12px',
    fontSize: $variant === 'compact' ? '13px' : '14px',
    border: `2px solid ${$disabled ? theme.colors.dropdown.border + '80' : theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    background: $disabled ? theme.colors.dark + '80' : theme.colors.dark,
    color: $disabled ? theme.colors.text + '80' : theme.colors.text,
    cursor: $disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.2s ease-in-out',
    ':hover': {
      borderColor: $disabled ? theme.colors.dropdown.border + '80' : theme.colors.primary
    }
  })
);

const DropdownContainer = styled('div')({
  background: theme.colors.dark,
  border: `2px solid ${theme.colors.dropdown.border}`,
  borderRadius: theme.border.radius,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  maxHeight: '300px',
  overflowY: 'auto',
  overflowX: 'hidden',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column'
});

const SearchInput = styled('input')({
  width: '100%',
  padding: '8px 12px',
  paddingRight: '24px',
  background: theme.colors.darker,
  border: 'none',
  borderBottom: `1px solid ${theme.colors.dropdown.border}`,
  color: theme.colors.text,
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  minWidth: 0
});

const DropdownItem = styled('div')<{ $highlighted?: boolean }>(({ $highlighted }) => ({
  padding: '8px 12px',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  backgroundColor: $highlighted ? theme.colors.dropdown.hoverBackground : 'transparent',
  ':hover': {
    backgroundColor: theme.colors.dropdown.hoverBackground
  }
}));

const StyledSelect: React.FC<StyledSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  style,
  renderOption,
  variant = 'default',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const buttonRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  const filteredOptions = options.filter(option => 
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev + 1 >= filteredOptions.length ? 0 : prev + 1;
          const element = listRef.current?.children[next];
          element?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev - 1 < 0 ? filteredOptions.length - 1 : prev - 1;
          const element = listRef.current?.children[next];
          element?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          const selectedOption = filteredOptions[highlightedIndex];
          onChange(selectedOption.id);
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleToggleDropdown = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  return (
    <SelectContainer style={style}>
      <SelectButton
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          handleToggleDropdown();
        }}
        $variant={variant}
        $disabled={disabled}
      >
        {selectedOption ? (
          renderOption ? renderOption(selectedOption) : selectedOption.name
        ) : placeholder}
      </SelectButton>

      <DropdownPortal
        anchorEl={buttonRef.current}
        open={isOpen && !disabled}
        onClose={() => {
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
        }}
      >
        <DropdownContainer onClick={(e) => e.stopPropagation()}>
          <SearchInput
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              e.stopPropagation();
              setSearchTerm(e.target.value);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              handleKeyDown(e);
            }}
            placeholder="Search..."
            onClick={(e) => e.stopPropagation()}
          />
          <div ref={listRef} style={{ overflow: 'auto', minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
            {filteredOptions.map((option, index) => (
              <DropdownItem
                key={option.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(option.id);
                  setIsOpen(false);
                  setSearchTerm('');
                  setHighlightedIndex(-1);
                }}
                $highlighted={index === highlightedIndex}
              >
                {renderOption ? renderOption(option) : option.name}
              </DropdownItem>
            ))}
          </div>
        </DropdownContainer>
      </DropdownPortal>
    </SelectContainer>
  );
};

export default StyledSelect; 