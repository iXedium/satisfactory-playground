import React, { useState, useRef, useEffect } from 'react';
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
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        // Scroll into view if needed
        if (listRef.current && highlightedIndex >= 0) {
          const items = listRef.current.getElementsByClassName('dropdown-item');
          const nextItem = items[highlightedIndex + 1];
          if (nextItem) {
            nextItem.scrollIntoView({ block: 'nearest' });
          }
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        // Scroll into view if needed
        if (listRef.current && highlightedIndex > 0) {
          const items = listRef.current.getElementsByClassName('dropdown-item');
          const prevItem = items[highlightedIndex - 1];
          if (prevItem) {
            prevItem.scrollIntoView({ block: 'nearest' });
          }
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
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

  const searchInputStyles: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: theme.colors.darker,
    border: 'none',
    borderBottom: `1px solid ${theme.colors.dropdown.border}`,
    color: theme.colors.text,
    fontSize: '14px',
    outline: 'none'
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
        onClose={() => {
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
        }}
      >
        <div style={dropdownStyles}>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            style={searchInputStyles}
            onClick={(e) => e.stopPropagation()}
          />
          <div ref={listRef} style={{ overflow: 'auto' }}>
            {filteredOptions.map((option, index) => (
              <div
                key={option.id}
                className="dropdown-item"
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                  setSearchTerm('');
                  setHighlightedIndex(-1);
                }}
                style={{
                  ...dropdownItemStyles,
                  backgroundColor: index === highlightedIndex ? theme.colors.dropdown.hoverBackground : 'transparent'
                }}
              >
                {renderOption ? renderOption(option) : option.name}
              </div>
            ))}
          </div>
        </div>
      </DropdownPortal>
    </div>
  );
};

export default StyledSelect; 