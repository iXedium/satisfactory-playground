import { theme } from './theme';

export const recipeSelectStyles = {
  selectContainer: {
    position: 'relative' as const,
    width: '250px',
  },
  customSelect: {
    width: '100%',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    cursor: 'pointer',
    backgroundColor: theme.colors.dark,
    border: `2px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    color: theme.colors.text,
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      borderColor: theme.colors.primary,
    },
  },
  dropdown: {
    position: 'absolute' as const,
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.dropdown.background,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    zIndex: theme.zIndex.dropdown,
    maxHeight: '300px',
    overflowY: 'auto' as const,
  },
  dropdownItem: {
    padding: '10px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.gap,
    color: theme.colors.text,
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: theme.colors.dropdown.hoverBackground,
    },
  },
  dropdownItemSelected: {
    backgroundColor: theme.colors.darker,
  },
} as const;
