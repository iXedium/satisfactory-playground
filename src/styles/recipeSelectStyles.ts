import { theme } from './theme';

export const recipeSelectStyles = {
  selectContainer: {
    position: 'relative' as const,
    width: '100%',
  },
  customSelect: {
    width: '100%',
    minWidth: '120px',
    padding: theme.spacing.padding,
    cursor: 'pointer',
    backgroundColor: theme.colors.dropdown.background,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    color: theme.colors.dropdown.text,
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.dropdown.background,
    border: `1px solid ${theme.colors.dropdown.border}`,
    borderRadius: theme.border.radius,
    marginTop: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    zIndex: 1000, // Ensure it appears above other content
    maxHeight: '300px',
    overflowY: 'auto' as const,
    color: theme.colors.text,
  },
  dropdownItem: {
    padding: theme.spacing.padding,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.gap,
    color: theme.colors.dropdown.text,
    backgroundColor: 'transparent',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: theme.colors.hover,
    },
  },
  dropdownItemSelected: {
    backgroundColor: theme.colors.dropdown.hoverBackground,
  },
} as const;
