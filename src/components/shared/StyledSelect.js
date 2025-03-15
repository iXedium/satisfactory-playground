import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { theme } from '../../styles/theme';
import DropdownPortal from '../DropdownPortal';
const SelectContainer = styled('div')({
    position: 'relative'
});
const SelectButton = styled('div')(({ $variant = 'default', $disabled = false }) => ({
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
}));
const DropdownContainer = styled('div')({
    background: theme.colors.dark,
    border: `2px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    maxHeight: '300px',
    overflowY: 'auto',
    overflowX: 'hidden',
    zIndex: 1000,
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
const DropdownItem = styled('div')(({ $highlighted }) => ({
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    backgroundColor: $highlighted ? theme.colors.dropdown.hoverBackground : 'transparent',
    ':hover': {
        backgroundColor: theme.colors.dropdown.hoverBackground
    }
}));
const StyledSelect = ({ value, onChange, options, placeholder = "Select an option", style, renderOption, variant = 'default', disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const buttonRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);
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
    const filteredOptions = options.filter(option => option.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const handleKeyDown = (e) => {
        if (!isOpen)
            return;
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
        if (disabled)
            return;
        setIsOpen(!isOpen);
    };
    return (_jsxs(SelectContainer, { style: style, children: [_jsx(SelectButton, { ref: buttonRef, onClick: handleToggleDropdown, "$variant": variant, "$disabled": disabled, children: selectedOption ? (renderOption ? renderOption(selectedOption) : selectedOption.name) : placeholder }), _jsx(DropdownPortal, { anchorEl: buttonRef.current, open: isOpen && !disabled, onClose: () => {
                    setIsOpen(false);
                    setSearchTerm('');
                    setHighlightedIndex(-1);
                }, children: _jsxs(DropdownContainer, { children: [_jsx(SearchInput, { ref: inputRef, type: "text", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), onKeyDown: handleKeyDown, placeholder: "Search...", onClick: (e) => e.stopPropagation() }), _jsx("div", { ref: listRef, style: { overflow: 'auto', minWidth: 0 }, children: filteredOptions.map((option, index) => (_jsx(DropdownItem, { onClick: () => {
                                    onChange(option.id);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                    setHighlightedIndex(-1);
                                }, "$highlighted": index === highlightedIndex, children: renderOption ? renderOption(option) : option.name }, option.id))) })] }) })] }));
};
export default StyledSelect;
