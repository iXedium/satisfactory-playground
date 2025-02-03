import { theme } from "./theme";

export const recipeSelectStyles = {
  selectContainer: {
    position: "relative" as const,
    width: "100%",
  },
  customSelect: {
    width: "100%",
    minWidth: "200px",
    padding: theme.spacing.padding,
    cursor: "pointer",
    backgroundColor: theme.colors.dark,
    border: theme.border.style,
    borderRadius: theme.border.radius,
    color: theme.colors.text,
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.darker,
    border: theme.border.style,
    borderRadius: theme.border.radius,
    marginTop: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    zIndex: 1000, // Ensure it appears above other content
    maxHeight: '200px',
    overflowY: 'auto' as const,
    color: theme.colors.text,
  },
  dropdownItem: {
    padding: theme.spacing.padding,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.gap,
    '&:hover': {
      backgroundColor: theme.colors.hover,
    },
    color: theme.colors.text,
  },
};
