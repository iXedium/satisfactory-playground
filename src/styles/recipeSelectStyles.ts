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
  },
  dropdown: {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: theme.colors.dark,
    border: theme.border.style,
    borderTop: "none",
    borderRadius: `0 0 ${theme.border.radius} ${theme.border.radius}`,
    maxHeight: "300px",
    overflowY: "auto" as const,
    zIndex: theme.zIndex.dropdown,
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
  },
};
