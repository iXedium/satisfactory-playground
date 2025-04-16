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
  renderOption?: (option: { id: string; name: string }, isInDropdown: boolean) => React.ReactNode;
  variant?: 'default' | 'compact';
  disabled?: boolean;
  recentItems?: string[];
  onRemoveRecentItem?: (itemId: string) => void;
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

const SectionDivider = styled('div')({
  padding: '4px 12px',
  backgroundColor: theme.colors.darker,
  color: theme.colors.text + '80',
  fontSize: '12px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  borderTop: `1px solid ${theme.colors.dropdown.border}`,
  borderBottom: `1px solid ${theme.colors.dropdown.border}`,
});

const StyledSelect: React.FC<StyledSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  style,
  renderOption,
  variant = 'default',
  disabled = false,
  recentItems = [],
  onRemoveRecentItem
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const buttonRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Safeguard: Ensure options is an array before using .find()
  const selectedOption = Array.isArray(options) ? options.find(opt => opt.id === value) : undefined;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  // Filter options based on search term
  // Safeguard: Ensure options is an array before using .filter()
  const filteredOptions = Array.isArray(options) 
    ? options.filter(option => 
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) 
    : [];

  // Generate a list of recent options based on recentItems
  // Safeguard: Ensure options is an array before using .find()
  const recentOptions = Array.isArray(options) 
    ? recentItems
        .map(itemId => options.find(opt => opt.id === itemId))
        .filter((item): item is { id: string; name: string } => !!item)
    : [];

  // Filter out recent items from the main filtered list to avoid duplicates
  const nonRecentFilteredOptions = recentOptions.length > 0 
    ? filteredOptions.filter(opt => !recentItems.includes(opt.id))
    : filteredOptions;

  // Function to handle arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    
    // Calculate total items (recent + regular, taking into account the divider)
    const totalItems = recentOptions.length > 0 && searchTerm === '' 
      ? recentOptions.length + nonRecentFilteredOptions.length
      : filteredOptions.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev + 1 >= totalItems ? 0 : prev + 1;
          
          // Skip divider when navigating
          let element;
          if (recentOptions.length > 0 && searchTerm === '' && next === recentOptions.length) {
            // Skip divider when going down
            const nextAfterDivider = next + 1;
            element = listRef.current?.children[nextAfterDivider];
            return nextAfterDivider;
          } else {
            element = listRef.current?.children[next];
          }
          
          element?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev - 1 < 0 ? totalItems - 1 : prev - 1;
          
          // Skip divider when navigating
          let element;
          if (recentOptions.length > 0 && searchTerm === '' && next === recentOptions.length) {
            // Skip divider when going up
            const nextBeforeDivider = next - 1;
            element = listRef.current?.children[nextBeforeDivider];
            return nextBeforeDivider;
          } else {
            element = listRef.current?.children[next];
          }
          
          element?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          let selectedOption;
          
          if (recentOptions.length > 0 && searchTerm === '') {
            // Handle selection from either recent or main list
            if (highlightedIndex < recentOptions.length) {
              selectedOption = recentOptions[highlightedIndex];
            } else if (highlightedIndex > recentOptions.length) { // Skip divider
              const indexInNonRecent = highlightedIndex - recentOptions.length - 1;
              selectedOption = nonRecentFilteredOptions[indexInNonRecent];
            }
          } else {
            selectedOption = filteredOptions[highlightedIndex];
          }
          
          if (selectedOption) {
            onChange(selectedOption.id);
            setIsOpen(false);
            setSearchTerm('');
            setHighlightedIndex(-1);
          }
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
          renderOption ? renderOption(selectedOption, false) : selectedOption.name
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
            {/* Show recent items at the top if search is empty */}
            {/* Safeguard: Check recentOptions array */}
            {recentOptions.length > 0 && searchTerm === '' && (
              <>
                {recentOptions.map((option, index) => (
                  <DropdownItem
                    key={`recent-${option.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(option.id);
                      setIsOpen(false);
                      setSearchTerm('');
                      setHighlightedIndex(-1);
                    }}
                    $highlighted={index === highlightedIndex}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      {renderOption ? renderOption(option, true) : option.name}
                      {/* {(console.log(`[DEBUG RECENT BTN] Rendering recent item ${option.id}. Has onRemoveRecentItem: ${!!onRemoveRecentItem}`), null)} */}
                      {onRemoveRecentItem && (
                        <button
                          style={removeButtonStyle}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRecentItem(option.id);
                          }}
                          title={`Remove ${option.name} from recent`}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  </DropdownItem>
                ))}
                
                <SectionDivider>
                  Recent Items
                </SectionDivider>
                
                {/* Safeguard: Check nonRecentFilteredOptions array */}
                {nonRecentFilteredOptions.map((option, index) => (
                  <DropdownItem
                    key={option.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(option.id);
                      setIsOpen(false);
                      setSearchTerm('');
                      setHighlightedIndex(-1);
                    }}
                    $highlighted={index + recentOptions.length + 1 === highlightedIndex}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      {renderOption ? renderOption(option, true) : option.name}
                    </div>
                  </DropdownItem>
                ))}
              </>
            )}
            
            {/* Show filtered list when searching or no recent items */}
            {/* Safeguard: Check filteredOptions array */}
            {(searchTerm !== '' || recentOptions.length === 0) && 
              filteredOptions.map((option, index) => (
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    {renderOption ? renderOption(option, true) : option.name}
                  </div>
                </DropdownItem>
              ))
            }
          </div>
        </DropdownContainer>
      </DropdownPortal>
    </SelectContainer>
  );
};

// Add styles for the remove button
const removeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: theme.colors.textSecondary,
  cursor: 'pointer',
  fontSize: '16px',
  lineHeight: '1',
  padding: '0 4px',
  marginLeft: '8px',
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0.7,
  transition: 'opacity 0.2s, color 0.2s',
};

export default StyledSelect; 